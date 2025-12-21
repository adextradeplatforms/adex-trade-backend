import express from "express";
import Transaction from "../models/Transaction.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * User clicks "I have deposited"
 */
router.post("/request", protect, async (req, res) => {
  try {
    const pending = await Transaction.findOne({
      user: req.user._id,
      type: "deposit",
      status: "pending",
    });

    if (pending) {
      return res.status(400).json({ message: "Deposit already pending" });
    }

    await Transaction.create({
      user: req.user._id,
      type: "deposit",
      amount: 0,
      status: "pending",
    });

    res.json({
      message: "Deposit request created. Waiting for blockchain confirmation.",
      ownerAddress: process.env.OWNER_ADDRESS,
      network: "BEP20 (BSC)",
      minDeposit: 20,
    });
  } catch (err) {
    res.status(500).json({ message: "Deposit request failed" });
  }
});

export default router;
