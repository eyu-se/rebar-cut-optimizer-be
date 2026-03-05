import type { Request, Response, NextFunction } from 'express';
export declare const createJob: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const uploadRequirements: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getJobSummary: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getJobPatterns: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const optimizeJob: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const exportJobExcel: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=job.controller.d.ts.map