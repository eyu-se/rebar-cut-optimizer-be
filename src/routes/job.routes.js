import { Router } from 'express';
import multer from 'multer';
import { createJob, uploadRequirements, getJobSummary, getJobPatterns, optimizeJob, } from '../controllers/job.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
const router = Router();
const upload = multer({ dest: 'uploads/' }); // temporary storage
// All job routes require authentication
router.use(authenticateJWT);
router.post('/', createJob);
router.post('/:id/upload', upload.single('file'), uploadRequirements);
router.get('/:id/summary', getJobSummary);
router.get('/:id/patterns', getJobPatterns);
router.post('/:id/optimize', optimizeJob);
export default router;
//# sourceMappingURL=job.routes.js.map