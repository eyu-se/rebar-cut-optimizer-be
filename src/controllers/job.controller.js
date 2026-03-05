import prisma from '../utils/prisma.js';
import { processExcelFile } from '../utils/excelProcessor.js';
import { ffdAlgorithm } from '../utils/optimizationEngine.js';
import { generateExcelReport } from '../services/export.service.js';
// List all jobs for the current user
export const getJobs = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const jobs = await prisma.job.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(jobs);
    }
    catch (error) {
        next(error);
    }
};
// Create a new job
export const createJob = async (req, res, next) => {
    try {
        const { name, stockLengthMm, minOffcutToSaveMm, allowOffcutReuse } = req.body;
        const userId = req.user.userId;
        const job = await prisma.job.create({
            data: {
                name,
                stockLengthMm: stockLengthMm ?? 12000,
                minOffcutToSaveMm: minOffcutToSaveMm ?? 500,
                allowOffcutReuse: allowOffcutReuse ?? true,
                user: { connect: { id: userId } },
            },
        });
        res.status(201).json(job);
    }
    catch (error) {
        next(error);
    }
};
// Upload Excel/CSV file containing rebar requirements
export const uploadRequirements = async (req, res, next) => {
    try {
        const jobId = req.params.id;
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Process the file and store requirements
        const requirements = await processExcelFile(req.file.path);
        // Bulk create requirements linked to the job
        await prisma.rebarRequirement.createMany({
            data: requirements.map((r) => ({
                jobId: jobId,
                diameterMm: r.diameterMm,
                requiredLengthMm: r.requiredLengthMm,
                quantity: r.quantity,
                location: r.location,
            })),
        });
        res.json({ message: 'Requirements uploaded successfully', count: requirements.length });
    }
    catch (error) {
        next(error);
    }
};
// Get job summary (bars used, waste, etc.)
export const getJobSummary = async (req, res, next) => {
    try {
        const jobId = req.params.id;
        const stockBars = await prisma.stockBar.findMany({
            where: { jobId: jobId },
        });
        if (stockBars.length === 0) {
            return res.status(200).json({ totalBars: 0, totalScrap: 0, wastePercent: 0, totalOffcuts: 0 });
        }
        const totalBars = stockBars.length;
        const totalScrap = stockBars.filter(b => b.isScrap).reduce((sum, b) => sum + b.remainingLengthMm, 0);
        const totalOffcuts = stockBars.filter(b => !b.isScrap && b.remainingLengthMm > 0).reduce((sum, b) => sum + b.remainingLengthMm, 0);
        // Sum of all total length of bars used
        const totalStockLength = stockBars.reduce((sum, b) => sum + b.totalLengthMm, 0);
        const wastePercent = (totalScrap / totalStockLength) * 100;
        res.json({ totalBars, totalScrap, totalOffcuts, wastePercent });
    }
    catch (error) {
        next(error);
    }
};
// Get detailed cut patterns
export const getJobPatterns = async (req, res, next) => {
    try {
        const jobId = req.params.id;
        const stockBars = await prisma.stockBar.findMany({
            where: { jobId: jobId },
            include: {
                cutPieces: {
                    include: {
                        requirement: true
                    }
                }
            },
        });
        res.json(stockBars);
    }
    catch (error) {
        next(error);
    }
};
// Run optimization
export const optimizeJob = async (req, res, next) => {
    try {
        const jobId = req.params.id;
        // 1. Fetch job and requirements
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { requirements: true },
        });
        if (!job)
            return res.status(404).json({ error: 'Job not found' });
        if (job.requirements.length === 0) {
            return res.status(400).json({ error: 'No requirements found for this job' });
        }
        // 2. Perform optimization
        const results = ffdAlgorithm(job.requirements, job.stockLengthMm, job.minOffcutToSaveMm);
        // 3. Persist results in a transaction
        await prisma.$transaction(async (tx) => {
            // Clear existing results if any (re-optimizing)
            await tx.stockBar.deleteMany({ where: { jobId: jobId } });
            for (const bar of results) {
                const createdBar = await tx.stockBar.create({
                    data: {
                        jobId: jobId,
                        diameterMm: bar.diameterMm,
                        totalLengthMm: bar.totalLengthMm,
                        remainingLengthMm: bar.remainingLengthMm,
                        isScrap: bar.isScrap,
                    },
                });
                // Create individual cut pieces
                await tx.cutPiece.createMany({
                    data: bar.pieces.map(p => ({
                        stockBarId: createdBar.id,
                        requirementId: p.requirementId,
                        lengthMm: p.lengthMm,
                    })),
                });
            }
            // Update job status
            await tx.job.update({
                where: { id: jobId },
                data: { status: 'COMPLETED' },
            });
        });
        res.json({ message: 'Optimization completed successfully', barsCount: results.length });
    }
    catch (error) {
        next(error);
    }
};
// Export job results to Excel
export const exportJobExcel = async (req, res, next) => {
    try {
        const jobId = req.params.id;
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                stockBars: {
                    include: { cutPieces: true }
                }
            }
        });
        if (!job)
            return res.status(404).json({ error: 'Job not found' });
        const buffer = generateExcelReport(job.name, job.stockBars);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Fabrication_Report_${job.name}.xlsx`);
        res.send(buffer);
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=job.controller.js.map