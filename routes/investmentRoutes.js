import express from "express";
import {
  createInvestment,
  stopInvestment
} from "../controllers/investmentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createInvestment);
router.post("/:investmentId/stop", protect, stopInvestment);

export default router;
