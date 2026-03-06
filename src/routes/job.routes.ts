import { Router } from 'express';
import multer from 'multer';
import {
    createJob,
    getJobs,
    getJobById,
    uploadRequirements,
    getJobSummary,
    getJobPatterns,
    optimizeJob,
    exportJobExcel,
    deleteJob,
} from '../controllers/job.controller.js';

import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = Router();
const upload = multer({ dest: 'uploads/' }); // temporary storage

// All job routes require authentication
router.use(authenticateJWT);

/**
 * @openapi
 * /api/jobs:
 *   get:
 *     summary: List all jobs for the current user
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of jobs
 */
router.get('/', getJobs);

/**
 * @openapi
 * /api/jobs/{id}:
 *   get:
 *     summary: Get a single job by ID
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job details
 *       404:
 *         description: Job not found
 */
router.get('/:id', getJobById);

/**
 * @openapi
 * /api/jobs:
 *   post:
 *     summary: Create a new optimization job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectName
 *             properties:
 *               projectName:
 *                 type: string
 *                 example: Sky Tower Project
 *     responses:
 *       201:
 *         description: Job created
 */
router.post('/', createJob);

/**
 * @openapi
 * /api/jobs/{id}/upload:
 *   post:
 *     summary: Upload Excel/CSV requirements for a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File processed and requirements uploaded
 */
router.post('/:id/upload', upload.single('file'), uploadRequirements);

/**
 * @openapi
 * /api/jobs/{id}/summary:
 *   get:
 *     summary: Get job optimization summary
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job summary data
 */
router.get('/:id/summary', getJobSummary);

/**
 * @openapi
 * /api/jobs/{id}/patterns:
 *   get:
 *     summary: Get detailed cutting patterns for a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detailed patterns data
 */
router.get('/:id/patterns', getJobPatterns);

/**
 * @openapi
 * /api/jobs/{id}/optimize:
 *   post:
 *     summary: Run optimization engine for a job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Optimization completed
 */
router.post('/:id/optimize', optimizeJob);

/**
 * @openapi
 * /api/jobs/{id}/export/excel:
 *   get:
 *     summary: Export job fabrication report to Excel
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Excel file buffer
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:id/export/excel', exportJobExcel);

/**
 * @openapi
 * /api/jobs/{id}:
 *   delete:
 *     summary: Delete a job and its associated data
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job deleted successfully
 *       404:
 *         description: Job not found
 *       403:
 *         description: Unauthorized
 */
router.delete('/:id', deleteJob);

export default router;
