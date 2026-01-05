import express from 'express';
import {
  getPlans,
  createInvestment,
  getMyInvestments,
  getInvestmentById,
  stopInvestment
} from '../controllers/investmentController.js';

import { authenticateToken, requireEmailVerification } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route - get all plans
router.get('/plans', getPlans);

// Protected routes
router.use(authenticateToken);
router.use(requireEmailVerification);

router.post('/invest', createInvestment);
router.get('/my-investments', getMyInvestments);
router.get('/:id', getInvestmentById);
router.post('/:id/stop', stopInvestment);

export default router;
