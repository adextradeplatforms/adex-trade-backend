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

// ✅ FIXED CORS (NETLIFY + LOCAL)
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://adex-trade-frontend.onrender.com"
    ],
    credentials: true,
  })
);

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

// Start server ONLY after DB connects
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);

      if (process.env.ENABLE_DEPOSIT_WATCHER === "true") {
        startDepositWatcher();
        console.log("💰 Deposit watcher started");
      }

      startProfitCron();
      console.log("📈 Profit cron started");

      startPlanCompletion();
      console.log("⏱️ Plan completion service started");
    });
  } catch (error) {
    console.error("❌ Server failed to start:", error.message);
    process.exit(1);
  }
};

startServer();
