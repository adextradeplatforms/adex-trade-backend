import express from "express";
import {
  getAdminStats,
  getAllUsers,
  getAllTransactions,
  approveTransaction,
  rejectTransaction,
  blockUser,
  unblockUser,
  deleteUser,
} from "../controllers/adminController.js";

import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ================= ADMIN DASHBOARD ================= */
router.get("/stats", protect, admin, getAdminStats);

/* ================= USERS ================= */
router.get("/users", protect, admin, getAllUsers);
router.put("/user/:id/block", protect, admin, blockUser);
router.put("/user/:id/unblock", protect, admin, unblockUser);
router.delete("/user/:id", protect, admin, deleteUser);

/* ================= TRANSACTIONS ================= */
router.get("/transactions", protect, admin, getAllTransactions);
router.put("/transaction/:id/approve", protect, admin, approveTransaction);
router.put("/transaction/:id/reject", protect, admin, rejectTransaction);

export default router;
