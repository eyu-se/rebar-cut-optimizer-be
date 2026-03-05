import type { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';

/**
 * Get waste trend over time (last 6 months).
 */
export const getWasteTrend = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;

        // Fetch all completed jobs for the user
        const jobs = await prisma.job.findMany({
            where: {
                userId,
                status: 'COMPLETED'
            },
            include: {
                stockBars: true
            },
            orderBy: { createdAt: 'asc' }
        });

        // Group by month
        const monthlyData: Record<string, { totalScrap: number; totalStock: number }> = {};

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        jobs.forEach(job => {
            const date = new Date(job.createdAt);
            const key = `${monthNames[date.getMonth()]}`;

            if (!monthlyData[key]) {
                monthlyData[key] = { totalScrap: 0, totalStock: 0 };
            }

            const jobScrap = job.stockBars.filter(b => b.isScrap).reduce((sum, b) => sum + b.remainingLengthMm, 0);
            const jobStock = job.stockBars.reduce((sum, b) => sum + b.totalLengthMm, 0);

            monthlyData[key].totalScrap += jobScrap;
            monthlyData[key].totalStock += jobStock;
        });

        const trend = Object.entries(monthlyData).map(([month, data]) => ({
            month,
            waste: data.totalStock > 0 ? Number(((data.totalScrap / data.totalStock) * 100).toFixed(1)) : 0
        }));

        res.json(trend.slice(-7)); // Last 7 months/entries
    } catch (error) {
        next(error);
    }
};

/**
 * Get waste percentage by diameter.
 */
export const getWasteByDiameter = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;

        const stockBars = await prisma.stockBar.findMany({
            where: {
                job: { userId }
            }
        });

        const diameterData: Record<number, { totalScrap: number; totalStock: number }> = {};

        stockBars.forEach(bar => {
            const dia = bar.diameterMm;
            if (!diameterData[dia]) {
                diameterData[dia] = { totalScrap: 0, totalStock: 0 };
            }
            if (bar.isScrap) {
                diameterData[dia].totalScrap += bar.remainingLengthMm;
            }
            diameterData[dia].totalStock += bar.totalLengthMm;
        });

        const report = Object.entries(diameterData).map(([dia, data]) => ({
            diameter: `${dia}mm`,
            waste: data.totalStock > 0 ? Number(((data.totalScrap / data.totalStock) * 100).toFixed(1)) : 0
        })).sort((a, b) => parseInt(a.diameter) - parseInt(b.diameter));

        res.json(report);
    } catch (error) {
        next(error);
    }
};

/**
 * Get stock usage by project.
 */
export const getUsageByProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;

        const jobs = await prisma.job.findMany({
            where: { userId },
            include: {
                stockBars: true
            }
        });

        const projectData: Record<string, number> = {};

        jobs.forEach(job => {
            const projectName = job.projectName || 'Default Project';
            if (!projectData[projectName]) {
                projectData[projectName] = 0;
            }
            projectData[projectName] += job.stockBars.length;
        });

        const report = Object.entries(projectData).map(([project, bars]) => ({
            project,
            bars
        })).sort((a, b) => b.bars - a.bars);

        res.json(report);
    } catch (error) {
        next(error);
    }
};

/**
 * Get aggregated stats for the dashboard.
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;

        const jobs = await prisma.job.findMany({
            where: { userId },
            include: { stockBars: true }
        });

        const totalJobs = jobs.length;
        let totalBars = 0;
        let totalScrap = 0;
        let totalStockLength = 0;

        jobs.forEach(job => {
            totalBars += job.stockBars.length;
            job.stockBars.forEach(bar => {
                totalStockLength += bar.totalLengthMm;
                if (bar.isScrap) {
                    totalScrap += bar.remainingLengthMm;
                }
            });
        });

        const avgWastePercent = totalStockLength > 0 ? (totalScrap / totalStockLength) * 100 : 0;

        res.json({
            totalJobs,
            totalBars,
            totalScrap,
            avgWastePercent: Number(avgWastePercent.toFixed(2))
        });
    } catch (error) {
        next(error);
    }
};
