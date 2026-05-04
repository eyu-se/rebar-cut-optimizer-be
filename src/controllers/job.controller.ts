import type { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';
import { processExcelFile } from '../utils/excelProcessor.js';
import { ffdAlgorithm } from '../utils/optimizationEngine.js';
import { generateExcelReport } from '../services/export.service.js';


// List all jobs for the current user
export const getJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const search = req.query.search as string;

        let whereClause: any = { userId };

        if (search) {
            whereClause = {
                ...whereClause,
                OR: [
                    { name: { contains: search } }, // SQLite doesn't natively support mode: 'insensitive' in simple contains without a specific PRAGMA or complex setup, but Prisma emulates it or we rely on default case-insensitivity of LIKE in SQLite, actually Prisma SQLite doesn't support mode: 'insensitive'. However, SQLite's LIKE is case-insensitive by default for ASCII! We will just use `contains`.
                    { projectName: { contains: search } }
                ]
            };
        }

        const jobs = await prisma.job.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
        });
        res.json(jobs);
    } catch (error) {
        next(error);
    }
};

// Get a single job by ID
export const getJobById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const jobId = req.params.id;
        const userId = (req as any).user.userId;
        const job = await prisma.job.findUnique({
            where: { id: jobId as string },
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // Security check: ensure the job belongs to the current user
        if (job.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        res.json(job);
    } catch (error) {
        next(error);
    }
};

// Create a new job
export const createJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, projectName, stockLengthMm, minOffcutToSaveMm, allowOffcutReuse } = req.body;
        const userId = (req as any).user.userId;
        const job = await prisma.job.create({
            data: {
                name,
                projectName: projectName || null,
                stockLengthMm: stockLengthMm ?? 12000,
                minOffcutToSaveMm: minOffcutToSaveMm ?? 500,
                allowOffcutReuse: allowOffcutReuse ?? true,
                user: { connect: { id: userId } },
            },
        });
        res.status(201).json(job);
    } catch (error) {
        next(error);
    }
};

// Upload Excel/CSV file containing rebar requirements
export const uploadRequirements = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const jobId = req.params.id;
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Process the file and store requirements
        const requirements = await processExcelFile(req.file.path);
        // Bulk create requirements linked to the job
        await prisma.rebarRequirement.createMany({
            data: requirements.map((r: any) => ({
                jobId: jobId as string,
                diameterMm: r.diameterMm,
                requiredLengthMm: r.requiredLengthMm,
                quantity: r.quantity,
                location: r.location,
            })),
        });
        res.json({ message: 'Requirements uploaded successfully', count: requirements.length });
    } catch (error) {
        next(error);
    }
};

// Get job summary (bars used, waste, etc.)
export const getJobSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const jobId = req.params.id;
        const job = await prisma.job.findUnique({
            where: { id: jobId as string },
            include: {
                stockBars: true
            }
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const stockBars = job.stockBars;

        if (stockBars.length === 0) {
            return res.status(200).json({
                jobName: job.name,
                projectName: job.projectName,
                stockLengthMm: job.stockLengthMm,
                totalBars: 0,
                totalScrap: 0,
                wastePercent: 0,
                totalOffcuts: 0
            });
        }

        const totalBars = stockBars.length;
        const totalScrap = stockBars.filter(b => b.isScrap).reduce((sum, b) => sum + b.remainingLengthMm, 0);
        const totalOffcuts = stockBars.filter(b => !b.isScrap && b.remainingLengthMm > 0).reduce((sum, b) => sum + b.remainingLengthMm, 0);

        // Sum of all total length of bars used
        const totalStockLength = stockBars.reduce((sum, b) => sum + b.totalLengthMm, 0);
        const wastePercent = (totalScrap / totalStockLength) * 100;
        const efficiency = 100 - wastePercent;

        res.json({
            jobName: job.name,
            projectName: job.projectName,
            stockLengthMm: job.stockLengthMm,
            totalBars,
            totalScrap,
            totalOffcuts,
            wastePercent: wastePercent.toFixed(2),
            efficiency: efficiency.toFixed(2)
        });
    } catch (error) {
        next(error);
    }
};


// Get detailed cut patterns grouped by diameter
export const getJobPatterns = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const jobId = req.params.id;
        const stockBars = await prisma.stockBar.findMany({
            where: { jobId: jobId as string },
            include: {
                cutPieces: {
                    include: {
                        requirement: true
                    }
                }
            },
        });

        // Group by diameter
        const groups: Record<number, any> = {};

        for (const bar of stockBars) {
            if (!groups[bar.diameterMm]) {
                groups[bar.diameterMm] = {
                    diameterMm: bar.diameterMm,
                    stockBarsUsed: 0,
                    totalScrap: 0,
                    totalStockLength: 0,
                    patterns: []
                };
            }

            const g = groups[bar.diameterMm];
            g.stockBarsUsed++;
            if (bar.isScrap) {
                g.totalScrap += bar.remainingLengthMm;
            }
            g.totalStockLength += bar.totalLengthMm;

            g.patterns.push({
                barId: bar.id,
                scrap: bar.remainingLengthMm,
                totalLengthMm: bar.totalLengthMm,
                isScrap: bar.isScrap,
                cuts: bar.cutPieces.map(cp => ({
                    id: cp.id,
                    length: cp.lengthMm,
                    quantity: 1,
                    location: cp.requirement.location
                }))
            });
        }

        // Finalize waste percent and convert to array
        const result = Object.values(groups).map(g => ({
            ...g,
            wastePercent: g.totalStockLength > 0 ? ((g.totalScrap / g.totalStockLength) * 100).toFixed(2) : 0
        }));

        res.json(result);
    } catch (error) {
        next(error);
    }
};


// Run optimization
export const optimizeJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const jobId = req.params.id;

        // 1. Fetch job and requirements
        const job = await prisma.job.findUnique({
            where: { id: jobId as string },
            include: { requirements: true },
        });

        if (!job) return res.status(404).json({ error: 'Job not found' });
        if (job.requirements.length === 0) {
            return res.status(400).json({ error: 'No requirements found for this job' });
        }

        // 2. Perform optimization
        const results = ffdAlgorithm(job.requirements, job.stockLengthMm, job.minOffcutToSaveMm);

        // 3. Persist results in a transaction
        // Use a longer timeout and batch inserts to avoid the default 5s expiry
        await prisma.$transaction(async (tx) => {
            // Clear existing results and offcuts for this job
            await tx.stockBar.deleteMany({ where: { jobId: jobId as string } });
            await tx.offcut.deleteMany({ where: { sourceJobId: jobId as string } });

            // Create all stock bars sequentially (need IDs for cut pieces)
            const allCutPiecesData: { stockBarId: string; requirementId: string; lengthMm: number }[] = [];
            const allOffcutsData: { diameterMm: number; lengthMm: number; sourceJobId: string; status: string }[] = [];

            for (const bar of results) {
                const createdBar = await tx.stockBar.create({
                    data: {
                        jobId: jobId as string,
                        diameterMm: bar.diameterMm,
                        totalLengthMm: bar.totalLengthMm,
                        remainingLengthMm: bar.remainingLengthMm,
                        isScrap: bar.isScrap,
                    },
                });

                // Collect cut pieces for batch insert
                for (const p of bar.pieces) {
                    allCutPiecesData.push({
                        stockBarId: createdBar.id,
                        requirementId: p.requirementId,
                        lengthMm: p.lengthMm,
                    });
                }

                // Collect offcuts for batch insert
                if (!bar.isScrap && bar.remainingLengthMm > 0) {
                    allOffcutsData.push({
                        diameterMm: bar.diameterMm,
                        lengthMm: bar.remainingLengthMm,
                        sourceJobId: jobId as string,
                        status: 'AVAILABLE',
                    });
                }
            }

            // Single bulk insert for all cut pieces
            if (allCutPiecesData.length > 0) {
                await tx.cutPiece.createMany({ data: allCutPiecesData });
            }

            // Single bulk insert for all offcuts
            if (allOffcutsData.length > 0) {
                await tx.offcut.createMany({ data: allOffcutsData });
            }

            // Update job status
            await tx.job.update({
                where: { id: jobId as string },
                data: { status: 'COMPLETED' },
            });
        }, { timeout: 30000 }); // 30s timeout to handle large jobs

        res.json({ message: 'Optimization completed successfully', barsCount: results.length });
    } catch (error) {
        next(error);
    }
};
// Export job results to Excel
export const exportJobExcel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const jobId = req.params.id;
        const job = await prisma.job.findUnique({
            where: { id: jobId as string },
            include: {
                stockBars: {
                    include: {
                        cutPieces: {
                            include: { requirement: true }
                        }
                    }
                }
            }
        });

        if (!job) return res.status(404).json({ error: 'Job not found' });

        const buffer = generateExcelReport(job.name, job.projectName, job.createdAt, (job as any).stockBars);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Fabrication_Report_${job.name}.xlsx`);
        res.send(buffer);
    } catch (error) {
        next(error);
    }
};

// Delete a job
export const deleteJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const jobId = req.params.id as string;
        const userId = (req as any).user.userId;

        // Verify the job belongs to the user
        const job = await prisma.job.findUnique({
            where: { id: jobId }
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        if (job.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized to delete this job' });
        }

        // Delete associated offcuts first
        await prisma.offcut.deleteMany({
            where: { sourceJobId: jobId }
        });

        // Delete the job (cascade handles requirements, stockBars, cutPieces)
        await prisma.job.delete({
            where: { id: jobId }
        });

        res.status(200).json({ message: 'Job deleted successfully' });
    } catch (error) {
        next(error);
    }
};
