import { Router } from 'express';
import { getAllUsers, updateRole, getAccessLogs, getMe } from '../controllers/user.controller.js';
import { authenticateJWT, authorizeRole } from '../middleware/auth.middleware.js';
import { logAccess } from '../middleware/accessLog.middleware.js';
const router = Router();
router.use(authenticateJWT);
router.get('/me', getMe);
// Admin / Manager routes
router.get('/', authorizeRole(['ADMIN', 'MANAGER']), logAccess('VIEW_USERS'), getAllUsers);
router.put('/:id/role', authorizeRole(['ADMIN']), logAccess('UPDATE_USER_ROLE'), updateRole);
// Admin only
router.get('/logs', authorizeRole(['ADMIN']), logAccess('VIEW_ACCESS_LOGS'), getAccessLogs);
export default router;
//# sourceMappingURL=user.routes.js.map