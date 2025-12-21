// controllers/userController.js
import User from "../models/User.js";

// Get profile of logged-in user
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "username email balance wallets role isVerified referrer createdAt"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.error("GetUserProfile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select(
      "username email balance wallets role isVerified referrer createdAt"
    );
    res.status(200).json(users);
  } catch (error) {
    console.error("GetAllUsers error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
