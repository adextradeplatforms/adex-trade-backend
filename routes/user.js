// routes/user.js
import express from "express";
import { getUserProfile, getAllUsers } from "../controllers/userController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// ================= ROUTES =================

// Get logged-in user profile (for Dashboard, Trade page)
router.get("/me", protect, getUserProfile);

// Get all users (admin only)
router.get("/", protect, admin, getAllUsers);

export default router;
