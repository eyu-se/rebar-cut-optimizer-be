import { Router } from 'express';
import { getOffcuts, deleteOffcut } from '../controllers/offcut.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = Router();

// Require auth for offcut routes
router.use(authenticateJWT);

/**
 * @openapi
 * /api/offcuts:
 *   get:
 *     summary: List all reusable offcuts
 *     tags: [Offcuts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of offcuts
 */
router.get('/', getOffcuts);

/**
 * @openapi
 * /api/offcuts/{id}:
 *   delete:
 *     summary: Delete an offcut from inventory
 *     tags: [Offcuts]
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
 *         description: Offcut deleted
 */
router.delete('/:id', deleteOffcut);

export default router;
