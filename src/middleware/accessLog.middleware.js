import prisma from '../utils/prisma.js';
export const logAccess = (action) => {
    return async (req, res, next) => {
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
            }
            catch (error) {
                console.error('Failed to log access:', error);
            }
        }
        next();
    };
};
//# sourceMappingURL=accessLog.middleware.js.map