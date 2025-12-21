import mongoose from "mongoose";

const investmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    planName: {
      type: String,
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    dailyProfit: {
      type: Number,
      required: true
    },

    startDate: {
      type: Date,
      default: Date.now
    },

    lastProfitDate: {
      type: Date,
      default: Date.now
    },

    totalProfit: {
      type: Number,
      default: 0
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Investment", investmentSchema);
