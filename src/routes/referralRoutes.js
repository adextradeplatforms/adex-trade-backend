import express from 'express';
const router = express.Router();

import {
  getReferralStats,
  getReferralTree,
  getReferralEarnings
} from '../controllers/referralController.js';

import { authenticateToken } from '../middleware/authMiddleware.js';

router.use(authenticateToken);

router.get('/stats', getReferralStats);
router.get('/tree', getReferralTree);
router.get('/earnings', getReferralEarnings);

export default router;
