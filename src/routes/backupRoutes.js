import express from 'express';
import * as backupController from '../controllers/backupController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// All backup routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

router.post('/create', backupController.createManualBackup);
router.get('/list', backupController.getAllBackups);
router.get('/stats', backupController.getStats);
router.get('/download/:filename', backupController.downloadBackup);
router.post('/restore', backupController.restoreFromBackup);
router.delete('/:filename', backupController.deleteBackup);
router.get('/verify/:filename', backupController.verifyBackupIntegrity);
router.post('/cleanup', backupController.cleanup);

export default router;
