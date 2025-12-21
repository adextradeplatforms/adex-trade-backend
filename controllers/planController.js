// controllers/planController.js
import Plan from "../models/Plan.js";
import ActivePlan from "../models/ActivePlan.js";
import User from "../models/User.js";
import { calculateProfit } from "../utils/calculateProfit.js";
import mongoose from "mongoose";

// ===============================
// GET ALL PLANS
// ===============================
export const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ minAmount: 1 });
    res.json({
      success: true,
      data: plans,
      count: plans.length
    });
  } catch (error) {
    console.error("Get plans error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error fetching plans" 
    });
  }
};

// ===============================
// GET PLAN BY ID
// ===============================
export const getPlanById = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found"
      });
    }
    
    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error("Get plan by ID error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error fetching plan" 
    });
  }
};

// ===============================
// CREATE PLAN (ADMIN)
// ===============================
export const createPlan = async (req, res) => {
  const { 
    name, 
    description,
    minAmount, 
    maxAmount,
    dailyPercent,
    durationDays, // Plan duration in days (optional)
    features, // Array of features
    isActive // Whether plan is available
  } = req.body;

  // Validation
  if (!name || !minAmount || !dailyPercent) {
    return res.status(400).json({ 
      success: false,
      message: "Name, minimum amount and daily percentage are required" 
    });
  }

  if (minAmount < 0 || dailyPercent < 0) {
    return res.status(400).json({ 
      success: false,
      message: "Amounts cannot be negative" 
    });
  }

  try {
    const plan = new Plan({
      name,
      description: description || "",
      minAmount,
      maxAmount: maxAmount || null,
      dailyPercent,
      durationDays: durationDays || null, // null = unlimited
      features: features || [],
      isActive: isActive !== undefined ? isActive : true
    });

    await plan.save();
    
    res.status(201).json({
      success: true,
      message: "Plan created successfully",
      data: plan
    });
  } catch (error) {
    console.error("Create plan error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error creating plan" 
    });
  }
};

// ===============================
// UPDATE PLAN (ADMIN)
// ===============================
export const updatePlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found"
      });
    }

    // Update only provided fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        plan[key] = req.body[key];
      }
    });

    await plan.save();
    
    res.json({
      success: true,
      message: "Plan updated successfully",
      data: plan
    });
  } catch (error) {
    console.error("Update plan error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error updating plan" 
    });
  }
};

// ===============================
// DELETE PLAN (ADMIN)
// ===============================
export const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found"
      });
    }

    // Check if any users have this plan active
    const activeUsers = await ActivePlan.countDocuments({ plan: plan._id });
    
    if (activeUsers > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan. ${activeUsers} users have this plan active.`
      });
    }

    await plan.deleteOne();
    
    res.json({
      success: true,
      message: "Plan deleted successfully"
    });
  } catch (error) {
    console.error("Delete plan error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error deleting plan" 
    });
  }
};

// ===============================
// ACTIVATE PLAN (USER)
// ===============================
export const activatePlan = async (req, res) => {
  const { planId } = req.params;
  const { amount } = req.body;

  try {
    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid investment amount is required"
      });
    }

    // Find plan
    const plan = await Plan.findById(planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found"
      });
    }

    // Check if plan is active
    if (!plan.isActive) {
      return res.status(400).json({
        success: false,
        message: "This plan is currently unavailable"
      });
    }

    // Check minimum amount
    if (amount < plan.minAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum investment for this plan is ${plan.minAmount}`
      });
    }

    // Check maximum amount if set
    if (plan.maxAmount && amount > plan.maxAmount) {
      return res.status(400).json({
        success: false,
        message: `Maximum investment for this plan is ${plan.maxAmount}`
      });
    }

    // Get user with current balance
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check balance
    if (user.balance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
        currentBalance: user.balance,
        requiredAmount: amount
      });
    }

    // Calculate end date if duration is set
    let endDate = null;
    if (plan.durationDays) {
      endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.durationDays);
    }

    // Deduct balance
    user.balance -= amount;
    await user.save();

    // Create active plan with unique ID
    const activePlan = new ActivePlan({
      user: user._id,
      plan: plan._id,
      planName: plan.name, // Store plan name for easy reference
      capital: amount,
      dailyPercent: plan.dailyPercent,
      startTime: new Date(),
      endTime: endDate,
      isActive: true,
      totalProfit: 0,
      lastProfitCalculation: new Date()
    });

    await activePlan.save();

    // Add to user's active plans array
    user.activePlans.push(activePlan._id);
    await user.save();

    res.status(201).json({
      success: true,
      message: "Plan activated successfully!",
      data: {
        plan: {
          id: activePlan._id,
          name: plan.name,
          capital: amount,
          dailyPercent: plan.dailyPercent,
          startTime: activePlan.startTime,
          endTime: activePlan.endTime,
          estimatedDailyProfit: amount * (plan.dailyPercent / 100)
        },
        newBalance: user.balance
      }
    });
  } catch (error) {
    console.error("Activate plan error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error activating plan" 
    });
  }
};

// ===============================
// GET USER'S ACTIVE PLANS
// ===============================
export const getUserActivePlans = async (req, res) => {
  try {
    const activePlans = await ActivePlan.find({ 
      user: req.user._id,
      isActive: true 
    })
    .populate('plan', 'name description')
    .sort({ startTime: -1 });

    // Calculate current profit for each plan
    const plansWithProfit = activePlans.map(plan => {
      const profit = calculateProfit(
        plan.capital,
        plan.dailyPercent,
        plan.startTime
      );
      
      return {
        ...plan.toObject(),
        currentProfit: profit,
        totalValue: plan.capital + profit,
        daysActive: Math.floor((new Date() - plan.startTime) / (1000 * 60 * 60 * 24))
      };
    });

    // Calculate totals
    const totalInvestment = activePlans.reduce((sum, plan) => sum + plan.capital, 0);
    const totalProfit = plansWithProfit.reduce((sum, plan) => sum + plan.currentProfit, 0);

    res.json({
      success: true,
      data: plansWithProfit,
      summary: {
        totalActivePlans: activePlans.length,
        totalInvestment,
        totalProfit,
        totalValue: totalInvestment + totalProfit
      }
    });
  } catch (error) {
    console.error("Get active plans error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error fetching active plans" 
    });
  }
};

// ===============================
// GET USER'S PLAN HISTORY
// ===============================
export const getPlanHistory = async (req, res) => {
  try {
    const history = await ActivePlan.find({ 
      user: req.user._id,
      isActive: false 
    })
    .populate('plan', 'name')
    .sort({ endTime: -1 })
    .limit(50);

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error("Get plan history error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error fetching plan history" 
    });
  }
};

// ===============================
// STOP/CLOSE A SPECIFIC PLAN (USER)
// ===============================
export const stopPlan = async (req, res) => {
  const { activePlanId } = req.params;

  try {
    const activePlan = await ActivePlan.findOne({
      _id: activePlanId,
      user: req.user._id
    });

    if (!activePlan) {
      return res.status(404).json({
        success: false,
        message: "Active plan not found or you don't have permission"
      });
    }

    if (!activePlan.isActive) {
      return res.status(400).json({
        success: false,
        message: "This plan is already closed"
      });
    }

    // Calculate final profit
    const profit = calculateProfit(
      activePlan.capital,
      activePlan.dailyPercent,
      activePlan.startTime
    );

    const totalReturn = activePlan.capital + profit;

    // Add to user's balance
    const user = await User.findById(req.user._id);
    user.balance += totalReturn;
    
    // Remove from active plans array
    user.activePlans = user.activePlans.filter(
      planId => planId.toString() !== activePlanId
    );
    
    await user.save();

    // Update active plan record
    activePlan.isActive = false;
    activePlan.endTime = new Date();
    activePlan.totalProfit = profit;
    activePlan.finalReturn = totalReturn;
    await activePlan.save();

    res.json({
      success: true,
      message: "Plan closed successfully",
      data: {
        capital: activePlan.capital,
        profit,
        totalReturn,
        newBalance: user.balance,
        durationDays: Math.floor((new Date() - activePlan.startTime) / (1000 * 60 * 60 * 24))
      }
    });
  } catch (error) {
    console.error("Stop plan error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error closing plan" 
    });
  }
};

// ===============================
// CLAIM PROFITS WITHOUT CLOSING PLAN (USER)
// ===============================
export const claimProfit = async (req, res) => {
  const { activePlanId } = req.params;

  try {
    const activePlan = await ActivePlan.findOne({
      _id: activePlanId,
      user: req.user._id,
      isActive: true
    });

    if (!activePlan) {
      return res.status(404).json({
        success: false,
        message: "Active plan not found"
      });
    }

    // Calculate profit since last claim or start
    const lastCalc = activePlan.lastProfitCalculation || activePlan.startTime;
    const profit = calculateProfit(
      activePlan.capital,
      activePlan.dailyPercent,
      lastCalc
    );

    if (profit <= 0) {
      return res.status(400).json({
        success: false,
        message: "No profit available to claim yet"
      });
    }

    // Add profit to user's balance
    const user = await User.findById(req.user._id);
    user.balance += profit;
    await user.save();

    // Update active plan
    activePlan.totalProfit += profit;
    activePlan.lastProfitCalculation = new Date();
    await activePlan.save();

    res.json({
      success: true,
      message: "Profit claimed successfully",
      data: {
        claimedAmount: profit,
        newBalance: user.balance,
        totalProfitFromPlan: activePlan.totalProfit,
        planCapital: activePlan.capital
      }
    });
  } catch (error) {
    console.error("Claim profit error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error claiming profit" 
    });
  }
};

// ===============================
// ADMIN: GET ALL ACTIVE PLANS (All Users)
// ===============================
export const getAllActivePlans = async (req, res) => {
  try {
    // Check if user is admin (you should have this middleware)
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const activePlans = await ActivePlan.find({ isActive: true })
      .populate('user', 'username email')
      .populate('plan', 'name dailyPercent')
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ActivePlan.countDocuments({ isActive: true });

    // Calculate totals
    const totalInvestment = await ActivePlan.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: "$capital" } } }
    ]);

    res.json({
      success: true,
      data: activePlans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary: {
        totalActivePlans: total,
        totalInvestment: totalInvestment[0]?.total || 0
      }
    });
  } catch (error) {
    console.error("Get all active plans error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error fetching all active plans" 
    });
  }
};
