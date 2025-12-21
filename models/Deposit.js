import mongoose from "mongoose";

const depositSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    txHash: {
      type: String,
      unique: true,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed"],
      default: "confirmed",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Deposit", depositSchema);
