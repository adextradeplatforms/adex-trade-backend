import express from 'express';
const router = express.Router();

// Named imports from adminController
import {
  getDashboard,
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  getPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getAllTransactions,
  getAllInvestments,
  getSettings,
  updateSettings
} from '../controllers/adminController.js';

import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

// Log controller (import all as logController)
import * as logController from '../controllers/logController.js';

// ===================== MIDDLEWARE =====================
// All admin routes require authentication and admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

// ===================== DASHBOARD =====================
router.get('/dashboard', getDashboard);

// ===================== USER MANAGEMENT =====================
router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetails);
router.patch('/users/:id/status', updateUserStatus);

// ===================== WITHDRAWAL MANAGEMENT =====================
router.get('/withdrawals/pending', getPendingWithdrawals);
router.post('/withdrawals/:id/approve', approveWithdrawal);
router.post('/withdrawals/:id/reject', rejectWithdrawal);

// ===================== TRANSACTION MANAGEMENT =====================
router.get('/transactions', getAllTransactions);

// ===================== INVESTMENT MANAGEMENT =====================
router.get('/investments', getAllInvestments);

// ===================== PLATFORM SETTINGS =====================
router.get('/settings', getSettings);
router.patch('/settings', updateSettings);

// ===================== LOG MANAGEMENT =====================
router.get('/logs', logController.getLogs);
router.get('/logs/download', logController.downloadLogs);
router.post('/logs/clear', logController.clearLogs);
router.get('/logs/stats', logController.getLogStats);

export default router;
