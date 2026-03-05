import type { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';
import { processExcelFile } from '../utils/excelProcessor.js';

// Create a new job
export const createJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, stockLengthMm, minOffcutToSaveMm, allowOffcutReuse } = req.body;
        const userId = (req as any).user.userId;
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

// Get job summary (bars used, waste, etc.) – placeholder implementation
export const getJobSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const jobId = req.params.id;
        const job = await prisma.job.findUnique({
            where: { id: jobId as string },
            include: {
                stockBars: true,
                offcutsGenerated: true,
            },
        });
        if (!job) return res.status(404).json({ error: 'Job not found' });

        // Ensure properties exist before access for linting safety
        const stockBars = (job as any).stockBars || [];
        const offcutsGenerated = (job as any).offcutsGenerated || [];
        const totalBars = stockBars.length;
        const totalScrap = offcutsGenerated.reduce((sum: number, o: any) => sum + (o.lengthMm || 0), 0);
        const wastePercent = (totalScrap / (totalBars * job.stockLengthMm)) * 100;
        res.json({ totalBars, totalScrap, wastePercent });
    } catch (error) {
        next(error);
    }
};

// Get detailed cut patterns – placeholder
export const getJobPatterns = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const jobId = req.params.id;
        const stockBars = await prisma.stockBar.findMany({
            where: { jobId: jobId as string },
            include: { cutPieces: true },
        });
        res.json(stockBars);
    } catch (error) {
        next(error);
    }
};

// Run optimization – placeholder that just returns success
export const optimizeJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const jobId = req.params.id;
        // TODO: invoke actual optimization algorithm and persist results
        await prisma.job.update({
            where: { id: jobId as string },
            data: { status: 'COMPLETED' }
        });
        res.json({ message: 'Optimization completed (placeholder)' });
    } catch (error) {
        next(error);
    }
};
