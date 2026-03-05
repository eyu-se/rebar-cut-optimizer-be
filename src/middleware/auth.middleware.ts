import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
    };
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
            jwt.verify(token, (process.env.JWT_SECRET || 'secretKey') as string, (err: any, user: any) => {
                if (err) {
                    return res.status(403).json({ error: 'Invalid or expired token' });
                }
                req.user = user as any;
                next();
            });
        } else {
            res.status(401).json({ error: 'Malformed authorization header' });
        }
    } else {
        res.status(401).json({ error: 'Authorization header missing' });
    }
};

export const authorizeRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
        }
        next();
    };
};
