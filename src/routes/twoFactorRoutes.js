import express from 'express';
const router = express.Router();

import {
  generateTwoFactor,
  enableTwoFactor,
  disableTwoFactor
} from '../controllers/twoFactorController.js';

import { authenticateToken } from '../middleware/authMiddleware.js';

// ===================== 2FA ROUTES =====================

// All 2FA routes require authentication
router.use(authenticateToken);

// Generate 2FA secret + QR code
router.post('/generate', generateTwoFactor);

// Enable 2FA after code verification
router.post('/enable', enableTwoFactor);

// Disable 2FA
router.post('/disable', disableTwoFactor);

export default router;
