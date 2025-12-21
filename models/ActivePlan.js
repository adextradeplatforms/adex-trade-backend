import mongoose from "mongoose";

const activePlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
    capital: {
      type: Number,
      required: true,
    },
    dailyPercent: {
      type: Number,
      required: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ActivePlan", activePlanSchema);
