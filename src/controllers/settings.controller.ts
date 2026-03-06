import type { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';

/**
 * Get the current user's settings. Creates default settings if they don't exist.
 */
export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;

        let settings = await prisma.userSettings.findUnique({
            where: { userId }
        });

        // Initialize default settings if none exist
        if (!settings) {
            settings = await prisma.userSettings.create({
                data: {
                    userId,
                    defaultStockLengthMm: 12000,
                    defaultMinOffcutMm: 500,
                    allowMixedStockLengths: false,
                    scrapThresholdWarning: 5,
                }
            });
        }

        res.json(settings);
    } catch (error) {
        next(error);
    }
};

/**
 * Update the current user's settings.
 */
export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.userId;
        const { defaultStockLengthMm, defaultMinOffcutMm, allowMixedStockLengths, scrapThresholdWarning } = req.body;

        const settings = await prisma.userSettings.upsert({
            where: { userId },
            update: {
                defaultStockLengthMm: defaultStockLengthMm !== undefined ? Number(defaultStockLengthMm) : undefined,
                defaultMinOffcutMm: defaultMinOffcutMm !== undefined ? Number(defaultMinOffcutMm) : undefined,
                allowMixedStockLengths: allowMixedStockLengths !== undefined ? Boolean(allowMixedStockLengths) : undefined,
                scrapThresholdWarning: scrapThresholdWarning !== undefined ? Number(scrapThresholdWarning) : undefined,
            },
            create: {
                userId,
                defaultStockLengthMm: defaultStockLengthMm !== undefined ? Number(defaultStockLengthMm) : 12000,
                defaultMinOffcutMm: defaultMinOffcutMm !== undefined ? Number(defaultMinOffcutMm) : 500,
                allowMixedStockLengths: allowMixedStockLengths !== undefined ? Boolean(allowMixedStockLengths) : false,
                scrapThresholdWarning: scrapThresholdWarning !== undefined ? Number(scrapThresholdWarning) : 5,
            }
        });

        res.json(settings);
    } catch (error) {
        next(error);
    }
};
