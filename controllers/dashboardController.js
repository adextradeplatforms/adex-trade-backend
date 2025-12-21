import User from "../models/User.js";
import Withdrawal from "../models/Withdrawal.js";
import Transaction from "../models/Transaction.js";

// GET /api/dashboard
export const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user data
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Fetch withdrawals
    const withdrawals = await Withdrawal.find({ user: userId });

    // Fetch transaction history
    const transactions = await Transaction.find({ user: userId }).sort({ createdAt: -1 });

    // Dashboard data
    const dashboardData = {
      username: user.username,
      email: user.email,
      balance: user.balance,
      wallets: user.wallets,
      withdrawals,
      transactions,  // <-- added transaction history
      role: user.role,
      isVerified: user.isVerified,
      referrer: user.referrer,
      createdAt: user.createdAt,
    };

    res.status(200).json(dashboardData);
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
