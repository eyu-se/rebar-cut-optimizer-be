import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = Router();

// Require auth for settings routes
router.use(authenticateJWT);

/**
 * @openapi
 * /api/settings:
 *   get:
 *     summary: Get user settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User settings object
 */
router.get('/', getSettings);

/**
 * @openapi
 * /api/settings:
 *   put:
 *     summary: Update user settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               defaultStockLengthMm:
 *                 type: number
 *               defaultMinOffcutMm:
 *                 type: number
 *               allowMixedStockLengths:
 *                 type: boolean
 *               scrapThresholdWarning:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated settings object
 */
router.put('/', updateSettings);

export default router;
