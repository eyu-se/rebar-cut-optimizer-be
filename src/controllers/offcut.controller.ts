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

        // Group and sum quantities
        const groupedMap = new Map<string, any>();

        offcuts.forEach(o => {
            const sourceJobName = o.sourceJob?.name || 'Manual';
            const key = `${o.diameterMm}-${o.lengthMm}-${sourceJobName}-${o.status}`;

            if (groupedMap.has(key)) {
                const existing = groupedMap.get(key);
                existing.quantity += 1;
                existing.ids.push(o.id);
            } else {
                groupedMap.set(key, {
                    id: o.id, // Primary ID for keying in list
                    ids: [o.id],
                    diameter: o.diameterMm,
                    length: o.lengthMm,
                    quantity: 1,
                    sourceJob: sourceJobName,
                    status: o.status === 'AVAILABLE' ? 'Available' : o.status === 'REUSED' ? 'Used' : 'Reserved',
                    createdDate: o.createdAt.toISOString().split('T')[0]
                });
            }
        });

        res.json(Array.from(groupedMap.values()));
    } catch (error) {
        next(error);
    }
};

/**
 * Delete an offcut.
 */
export const deleteOffcut = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const idParam = req.params.id as string;
        if (!idParam) return res.status(400).json({ error: 'ID required' });

        const ids = idParam.split(',');

        await prisma.offcut.deleteMany({
            where: {
                id: { in: ids }
            }
        });

        res.json({ message: 'Offcut(s) deleted successfully' });
    } catch (error) {
        next(error);
    }
};
