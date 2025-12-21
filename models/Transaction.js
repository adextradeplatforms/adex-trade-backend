import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["deposit", "withdraw"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    txHash: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);
