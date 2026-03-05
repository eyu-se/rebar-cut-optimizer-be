import { Router } from 'express';
import { getWasteTrend, getWasteByDiameter, getUsageByProject } from '../controllers/report.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = Router();

// Require auth for report routes
router.use(authenticateJWT);

/**
 * @openapi
 * /api/reports/waste-trend:
 *   get:
 *     summary: Get waste trend over time
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly waste percentage
 */
router.get('/waste-trend', getWasteTrend);

/**
 * @openapi
 * /api/reports/waste-by-diameter:
 *   get:
 *     summary: Get waste percentage grouped by diameter
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Waste by diameter report
 */
router.get('/waste-by-diameter', getWasteByDiameter);

/**
 * @openapi
 * /api/reports/usage-by-project:
 *   get:
 *     summary: Get total stock bars used by project
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage by project report
 */
router.get('/usage-by-project', getUsageByProject);

export default router;
