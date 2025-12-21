import express from "express";
import {
  createDeposit,
  createWithdraw,
  getMyTransactions,
  getAllTransactions,
  approveTransaction,
  rejectTransaction,
} from "../controllers/transactionController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

/* User */
router.post("/deposit", protect, createDeposit);
router.post("/withdraw", protect, createWithdraw);
router.get("/my", protect, getMyTransactions);

/* Admin */
router.get("/", protect, admin, getAllTransactions);
router.put("/:id/approve", protect, admin, approveTransaction);
router.put("/:id/reject", protect, admin, rejectTransaction);

export default router;
