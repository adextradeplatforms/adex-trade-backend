// src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

import logger from './config/logger.js';
import requestLogger from './middleware/requestLogger.js';

import i18next, { initI18n } from './config/i18n.js';
import i18nextMiddleware from 'i18next-http-middleware';

import errorHandler from './middleware/errorHandler.js';
import languageRoutes from './routes/languageRoutes.js';
import { authenticateToken } from './middleware/authMiddleware.js';
import setUserLanguage from './middleware/languageMiddleware.js';

// ===================== ROUTES =====================
import authRoutes from './routes/authRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import investmentRoutes from './routes/investmentRoutes.js';
import referralRoutes from './routes/referralRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import passwordRoutes from './routes/passwordRoutes.js';
import twoFactorRoutes from './routes/twoFactorRoutes.js';
import backupRoutes from './routes/backupRoutes.js';

const app = express();

// 🔥 INIT I18N
await initI18n();

// ===================== SECURITY =====================
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(requestLogger);

// ===================== RATE LIMIT =====================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api/', limiter);

// ===================== BODY =====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===================== I18N =====================
app.use(i18nextMiddleware.handle(i18next));

// ===================== ROOT =====================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to ADEX Trade API',
  });
});

// ===================== HEALTH =====================
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ADEX Trade API is running',
    timestamp: new Date().toISOString(),
  });
});

// ===================== PUBLIC ROUTES =====================
app.use('/api/auth', authRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/languages', languageRoutes);

// ===================== PROTECTED ROUTES =====================
app.use('/api/wallet', authenticateToken, setUserLanguage, walletRoutes);
app.use('/api/investments', authenticateToken, setUserLanguage, investmentRoutes);
app.use('/api/referrals', authenticateToken, setUserLanguage, referralRoutes);
app.use('/api/admin', authenticateToken, setUserLanguage, adminRoutes);
app.use('/api/backups', authenticateToken, setUserLanguage, backupRoutes);

// ===================== 404 =====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// ===================== ERROR =====================
app.use(errorHandler);

export default app;
