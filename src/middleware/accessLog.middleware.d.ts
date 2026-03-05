import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.middleware.js';
export declare const logAccess: (action: string) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=accessLog.middleware.d.ts.map