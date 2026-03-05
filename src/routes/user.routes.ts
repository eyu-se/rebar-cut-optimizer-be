import { Router } from 'express';
import { getAllUsers, updateRole, getAccessLogs, getMe } from '../controllers/user.controller.js';

import { authenticateJWT, authorizeRole } from '../middleware/auth.middleware.js';

import { logAccess } from '../middleware/accessLog.middleware.js';


const router = Router();

router.use(authenticateJWT);

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *       401:
 *         description: Unauthorized
 */
router.get('/me', getMe);

// Admin / Manager routes
/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: List all users (Admin/Manager only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Forbidden
 */
router.get('/', authorizeRole(['ADMIN', 'MANAGER']), logAccess('VIEW_USERS'), getAllUsers);

/**
 * @openapi
 * /api/users/{id}/role:
 *   put:
 *     summary: Update user role (Admin only)
 *     tags: [Users]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [ADMIN, ENGINEER, MANAGER]
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       403:
 *         description: Forbidden
 */
router.put('/:id/role', authorizeRole(['ADMIN']), logAccess('UPDATE_USER_ROLE'), updateRole);

// Admin only
/**
 * @openapi
 * /api/users/logs:
 *   get:
 *     summary: View access logs (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of access logs
 *       403:
 *         description: Forbidden
 */
router.get('/logs', authorizeRole(['ADMIN']), logAccess('VIEW_ACCESS_LOGS'), getAccessLogs);

export default router;
