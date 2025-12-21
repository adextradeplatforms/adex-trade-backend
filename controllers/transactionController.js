// controllers/transactionController.js
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

/**
 * @desc    Create deposit
 * @route   POST /api/transactions/deposit
 */
export const createDeposit = async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  await distributeReferralBonus(user, amount);
  const transaction = await Transaction.create({
    user: req.user._id,
    type: "deposit",
    amount,
  });

  res.status(201).json(transaction);
};

/**
 * @desc    Create withdrawal
 * @route   POST /api/transactions/withdraw
 */
export const createWithdraw = async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  if (req.user.balance < amount) {
    return res.status(400).json({ message: "Insufficient balance" });
  }

  const transaction = await Transaction.create({
    user: req.user._id,
    type: "withdraw",
    amount,
  });

  res.status(201).json(transaction);
};

/**
 * @desc    Get my transactions
 * @route   GET /api/transactions/my
 */
export const getMyTransactions = async (req, res) => {
  const transactions = await Transaction.find({
    user: req.user._id,
  }).sort({ createdAt: -1 });

  res.json(transactions);
};
/**
 * @desc    Get all transactions (admin)
 * @route   GET /api/transactions
 */
export const getAllTransactions = async (req, res) => {
  const transactions = await Transaction.find()
    .populate("user", "email balance")
    .sort({ createdAt: -1 });

  res.json(transactions);
};

/**
 * @desc    Approve transaction
 * @route   PUT /api/transactions/:id/approve
 */
export const approveTransaction = async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  if (transaction.status !== "pending") {
    return res.status(400).json({ message: "Already processed" });
  }

  const user = await User.findById(transaction.user);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (transaction.type === "deposit") {
    user.balance += transaction.amount;
  }

  if (transaction.type === "withdraw") {
    if (user.balance < transaction.amount) {
      return res.status(400).json({ message: "User balance insufficient" });
    }
    user.balance -= transaction.amount;
  }

  transaction.status = "approved";

  await user.save();
  await transaction.save();

  res.json({ message: "Transaction approved" });
};

/**
 * @desc    Reject transaction
 * @route   PUT /api/transactions/:id/reject
 */
export const rejectTransaction = async (req, res) => {
  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  transaction.status = "rejected";
  await transaction.save();

  res.json({ message: "Transaction rejected" });
};
