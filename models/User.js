// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    balance: {
      type: Number,
      default: 0,
    },

    // User wallets (BEP20)
    wallets: {
      USDT: {
        address: {
          type: String,
          default: null,
        },
      },
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    totalDeposits: {
      type: Number,
      default: 0,
    },

    totalWithdrawals: {
      type: Number,
      default: 0,
    },

    referrals: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
