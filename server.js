import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/userRoutes.js";
import planRoutes from "./routes/planRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import depositRoutes from "./routes/depositRoutes.js";
import dashboardRoutes from "./routes/dashboard.js";
import investmentRoutes from "./routes/investmentRoutes.js";

// Services
import startDepositWatcher from "./services/depositWatcher.js";
import startProfitCron from "./services/profitCron.js";
import startPlanCompletion from "./services/planCompletion.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/wallets", walletRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/deposit", depositRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/investments", investmentRoutes);

// Connect DB
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Start deposit watcher only if enabled
  if (process.env.ENABLE_DEPOSIT_WATCHER === "true") {
    startDepositWatcher();
    console.log("💰 Deposit watcher started");
  }

  // Start profit cron
  startProfitCron();
  console.log("📈 Profit cron started");

  // Start plan completion checker
  startPlanCompletion();
  console.log("⏱️ Plan completion service started");
});
