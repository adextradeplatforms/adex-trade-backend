// src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import logger from './config/logger.js';
import requestLogger from './middleware/requestLogger.js';
import i18next from './config/i18n.js';
import i18nextMiddleware from 'i18next-http-middleware';
import errorHandler from './middleware/errorHandler.js';
import languageRoutes from './routes/languageRoutes.js';
import { authenticateToken } from './middleware/authMiddleware.js'; // ✅ named import
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

// ===================== SECURITY MIDDLEWARE =====================
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(requestLogger);

// ===================== RATE LIMITING =====================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// ===================== BODY PARSER =====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===================== I18N MIDDLEWARE =====================
app.use(i18nextMiddleware.handle(i18next));

// ===================== HEALTH CHECK =====================
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ADEX Trade API is running',
    timestamp: new Date().toISOString(),
  });
});

// ===================== API ROUTES =====================
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/languages', languageRoutes);

// ===================== APPLY LANGUAGE & AUTH MIDDLEWARE =====================
// Apply to all routes that have Authorization header
app.use(async (req, res, next) => {
  if (req.headers.authorization) {
    try {
      await authenticateToken(req, res, async () => {
        await setUserLanguage(req, res, next);
      });
    } catch (err) {
      next(); // ignore auth errors for language middleware
    }
  } else {
    next();
  }
});

// ===================== 404 HANDLER =====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// ===================== ERROR HANDLER =====================
app.use(errorHandler);

export default app;
