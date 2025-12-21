import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/platform", protect, (req, res) => {
  res.json({
    network: "BEP20",
    token: "USDT",
    address: process.env.OWNER_ADDRESS,
    minDeposit: 20
  });
});

export default router;
