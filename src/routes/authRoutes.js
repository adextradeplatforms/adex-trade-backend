// src/routes/authRoutes.js
import express from 'express';
import { 
  register, 
  login, 
  verifyEmail, 
  resendVerification, 
  refreshToken, 
  getProfile 
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ==========================
// Public routes
// ==========================
router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/refresh-token', refreshToken);

// ==========================
// Protected routes
// ==========================
router.get('/profile', authenticateToken, getProfile);

export default router;
