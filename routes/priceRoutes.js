import express from "express";
import { getPrices, updatePrice } from "../controllers/priceController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get coin prices
router.get("/", protect, getPrices);

// Update coin prices (admin only)
router.put("/:coinId", protect, admin, updatePrice);

export default router;
