import express from 'express';
import {
  getWallet,
  createDeposit,
  createWithdrawal,
  getTransactions,
  getTransactionById,
  confirmDeposit
} from '../controllers/walletController.js';

import { authenticateToken, requireEmailVerification } from '../middleware/authMiddleware.js';

const router = express.Router();

// Auth & verification middleware
router.use(authenticateToken);
router.use(requireEmailVerification);

// Wallet routes
router.get('/', getWallet);

// Deposits & Withdrawals
router.post('/deposit', createDeposit);
router.post('/withdraw', createWithdrawal);

// Transactions
router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransactionById);

// Admin endpoint example
router.post('/deposit/:id/confirm', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await confirmDeposit(id, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
