// controllers/walletController.js
import User from "../models/User.js";

// Get all user wallets (admin)
export const getWallets = async (req, res) => {
  try {
    const users = await User.find({}, "username email wallets");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Add wallet to user (optional, admin only)
export const addWallet = async (req, res) => {
  try {
    const { userId, usdtAddress } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.wallets.USDT.address = usdtAddress;
    await user.save();

    res.json({ message: "Wallet added successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
