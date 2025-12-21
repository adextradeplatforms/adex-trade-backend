// routes/planRoutes.js
import express from "express";
import {
  getPlans,
  createPlan,
  activatePlan,
  stopPlan,
} from "../controllers/planController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// User routes
router.get("/", protect, getPlans);
router.post("/activate/:planId", protect, activatePlan);
router.post("/stop", protect, stopPlan);

// Admin routes
router.post("/", protect, admin, createPlan);

export default router;
