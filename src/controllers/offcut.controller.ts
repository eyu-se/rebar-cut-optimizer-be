import type { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';

/**
 * List all available offcuts.
 */
export const getOffcuts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const offcuts = await prisma.offcut.findMany({
            include: {
                sourceJob: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map to format expected by FE
        const formatted = offcuts.map(o => ({
            id: o.id,
            diameter: o.diameterMm,
            length: o.lengthMm,
            quantity: 1, // Currently saved as individual pieces
            sourceJob: o.sourceJob?.name || 'Manual',
            status: o.status === 'AVAILABLE' ? 'Available' : o.status === 'REUSED' ? 'Used' : 'Reserved',
            createdDate: o.createdAt.toISOString().split('T')[0]
        }));

        res.json(formatted);
    } catch (error) {
        next(error);
    }
};

/**
 * Delete an offcut.
 */
export const deleteOffcut = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await prisma.offcut.delete({ where: { id } });
        res.json({ message: 'Offcut deleted successfully' });
    } catch (error) {
        next(error);
    }
};
