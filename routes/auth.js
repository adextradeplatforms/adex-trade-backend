import express from "express";
import {
  registerUser,
  verifyEmail,
  loginUser,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerUser);
router.get("/verify/:token", verifyEmail);
router.post("/login", loginUser);

export default router;
