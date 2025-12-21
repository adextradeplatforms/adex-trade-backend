import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
});

export default router;
