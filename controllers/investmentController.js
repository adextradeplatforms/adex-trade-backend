import User from "../models/User.js";
import Investment from "../models/Investment.js";
import { PLANS } from "../config/plans.js";

export const createInvestment = async (req, res) => {
  try {
    const { plan, amount } = req.body;
    const userId = req.user._id;

    const selectedPlan = Object.values(PLANS).find(
      p => p.name === plan
    );

    if (!selectedPlan) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    if (amount < selectedPlan.minInvestment) {
      return res.status(400).json({
        message: `Minimum investment is ${selectedPlan.minInvestment} USDT`
      });
    }

    const user = await User.findById(userId);

    if (user.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Deduct balance
    user.balance -= amount;
    await user.save();

    // Create investment
    const investment = await Investment.create({
      user: userId,
      planName: selectedPlan.name,
      amount,
      dailyProfit: selectedPlan.dailyProfit
    });

    res.status(201).json({
      message: "Investment started",
      investment
    });
  } catch (err) {
    console.error("Investment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const stopInvestment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { investmentId } = req.params;

    const investment = await Investment.findOne({
      _id: investmentId,
      user: userId,
      isActive: true
    }).populate("user");

    if (!investment) {
      return res.status(404).json({ message: "Investment not found" });
    }

    const now = new Date();
    const last = new Date(investment.lastProfitDate);
    const hoursPassed = (now - last) / (1000 * 60 * 60);

    if (hoursPassed > 0) {
      const profitPerHour =
        (investment.amount * (investment.dailyProfit / 100)) / 24;

      const finalProfit = profitPerHour * hoursPassed;

      investment.totalProfit += finalProfit;
      investment.user.balance += finalProfit;
    }

    investment.isActive = false;
    investment.lastProfitDate = now;

    await investment.user.save();
    await investment.save();

    res.json({
      message: "Plan stopped successfully",
      totalProfit: investment.totalProfit
    });
  } catch (err) {
    console.error("Stop plan error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
