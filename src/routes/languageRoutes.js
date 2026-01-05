// src/routes/languageRoutes.js
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  getLanguages,
  updateLanguage,
  getUserLanguage
} from '../controllers/languageController.js';

const router = express.Router();

// ===================== PUBLIC ROUTES =====================
// Get list of supported languages
router.get('/', getLanguages);

// ===================== PROTECTED ROUTES =====================
// Get user's current language
router.get('/me', authenticateToken, getUserLanguage);

// Update user's preferred language
router.put('/me', authenticateToken, updateLanguage);

export default router;
