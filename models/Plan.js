import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ""
  },
  minAmount: {
    type: Number,
    required: true,
    min: 0
  },
  maxAmount: {
    type: Number,
    default: null
  },
  dailyPercent: {
    type: Number,
    required: true,
    min: 0
  },
  durationDays: {
    type: Number,
    default: null // null = unlimited
  },
  features: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

planSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("Plan", planSchema);
