import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

// @desc   Admin statistics
// @route  GET /api/admin/stats
// @access Admin
export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const totalDeposits = await Transaction.aggregate([
      { $match: { type: "deposit", status: "approved" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalWithdrawals = await Transaction.aggregate([
      { $match: { type: "withdraw", status: "approved" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const pendingTransactions = await Transaction.countDocuments({
      status: "pending",
    });

    res.json({
      totalUsers,
      totalDeposits: totalDeposits[0]?.total || 0,
      totalWithdrawals: totalWithdrawals[0]?.total || 0,
      pendingTransactions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get all users
// @route  GET /api/admin/users
// @access Admin
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get all transactions
// @route  GET /api/admin/transactions
// @access Admin
export const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate("user", "email username")
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Approve transaction
// @route  PUT /api/admin/transaction/:id/approve
// @access Admin
export const approveTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    transaction.status = "approved";
    await transaction.save();

    res.json({ message: "Transaction approved" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Reject transaction
// @route  PUT /api/admin/transaction/:id/reject
// @access Admin
export const rejectTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    transaction.status = "rejected";
    await transaction.save();

    res.json({ message: "Transaction rejected" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc   Block user
// @route  PUT /api/admin/user/:id/block
// @access Admin
export const blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isBlocked = true;
    await user.save();

    res.json({ message: "User blocked successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Unblock user
// @route  PUT /api/admin/user/:id/unblock
// @access Admin
export const unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isBlocked = false;
    await user.save();

    res.json({ message: "User unblocked successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Delete user
// @route  DELETE /api/admin/user/:id
// @access Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.deleteOne();

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
