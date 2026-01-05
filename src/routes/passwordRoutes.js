// src/routes/passwordRoutes.js
import express from 'express';
import {
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  changePassword
} from '../controllers/passwordController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// ===================== PUBLIC ROUTES =====================
// Request password reset
router.post('/request-reset', requestPasswordReset);

// Verify reset token
router.get('/verify-token', verifyResetToken);

// Reset password using token
router.post('/reset', resetPassword);

// ===================== PROTECTED ROUTE =====================
// Change password for logged-in users
router.post('/change', authenticateToken, changePassword);

export default router;
