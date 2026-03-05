import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.middleware.js';
import prisma from '../utils/prisma.js';

export const logAccess = (action: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        // We execute the next middleware/controller first,
        // and log it asynchronously. Or we log it right before.
        if (req.user) {
            try {
                await prisma.accessLog.create({
                    data: {
                        userId: req.user.userId,
                        action: action,
                        ipAddress: req.ip || req.connection.remoteAddress || null,
                    },
                });
            } catch (error) {
                console.error('Failed to log access:', error);
            }
        }
        next();
    };
};
