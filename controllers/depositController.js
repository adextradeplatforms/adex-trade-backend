import Deposit from "../models/Deposit.js";
import User from "../models/User.js";

// User initiates a deposit (manual or automatic blockchain watch)
export const createDeposit = async (req, res) => {
  const { amount, txHash } = req.body;

  try {
    const deposit = await Deposit.create({
      user: req.user._id,
      amount,
      txHash,
    });

    res.json({
      message: "Deposit created successfully. Awaiting confirmation.",
      deposit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating deposit" });
  }
};

// Confirm deposit (automatic or admin action)
export const confirmDeposit = async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id);

    if (!deposit) return res.status(404).json({ message: "Deposit not found" });
    if (deposit.status === "confirmed")
      return res.status(400).json({ message: "Deposit already confirmed" });

    deposit.status = "confirmed";
    await deposit.save();

    const user = await User.findById(deposit.user);
    user.balance += deposit.amount;
    await user.save();

    res.json({ message: "Deposit confirmed and balance updated", deposit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error confirming deposit" });
  }
};
