import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { transporter } from "../config/email.js";

/* =====================================================
   REGISTER USER
===================================================== */
export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1️⃣ Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2️⃣ Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      isVerified: false,
    });

    // 5️⃣ Create verification token
    const verifyToken = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // 6️⃣ BACKEND verification link (IMPORTANT)
    const verificationLink = `http://localhost:5000/api/auth/verify/${verifyToken}`;

    // 7️⃣ Send verification email
    await transporter.sendMail({
      from: `"Adex Trade" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your email",
      html: `
        <h2>Email Verification</h2>
        <p>Hello <b>${username}</b>,</p>
        <p>Please click the button below to verify your email:</p>
        <a href="${verificationLink}"
           style="display:inline-block;padding:10px 15px;background:#0d6efd;color:#fff;text-decoration:none;border-radius:5px;">
          Verify Email
        </a>
        <p>If you did not create an account, ignore this email.</p>
      `,
    });

    return res.status(201).json({
      message: "Registration successful. Check your email to verify your account.",
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/* =====================================================
   VERIFY EMAIL
===================================================== */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: "Verification token missing" });
    }

    // 1️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2️⃣ Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 3️⃣ Already verified
    if (user.isVerified) {
      return res.status(200).json({ message: "Email already verified" });
    }

    // 4️⃣ Verify user
    user.isVerified = true;
    await user.save();

    return res.status(200).json({
      message: "Email verified successfully. You can now login.",
    });
  } catch (error) {
    console.error("Verify email error:", error.message);
    return res
      .status(400)
      .json({ message: "Invalid or expired verification link" });
  }
};

/* =====================================================
   LOGIN USER
===================================================== */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // 2️⃣ Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 3️⃣ Check verification
    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email before logging in" });
    }

    // 4️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 5️⃣ Generate auth token
    const authToken = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      token: authToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
