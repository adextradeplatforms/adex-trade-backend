import cron from "node-cron";
import Investment from "../models/Investment.js";
import User from "../models/User.js";

const DAILY_HOURS = 24;

const startProfitCron = () => {
  cron.schedule("0 * * * *", async () => {
    // runs every hour (safer than daily)
    try {
      const investments = await Investment.find({ isActive: true }).populate("user");

      for (const inv of investments) {
        const now = new Date();
        const last = new Date(inv.lastProfitDate);

        const hoursPassed = (now - last) / (1000 * 60 * 60);

        if (hoursPassed < 1) continue;

        const profitPerHour =
          (inv.amount * (inv.dailyProfit / 100)) / DAILY_HOURS;

        const profit = profitPerHour * hoursPassed;

        inv.totalProfit += profit;
        inv.lastProfitDate = now;

        inv.user.balance += profit;

        await inv.user.save();
        await inv.save();
      }

      console.log("✅ Profit cron executed");
    } catch (err) {
      console.error("❌ Profit cron error:", err);
    }
  });
};

export default startProfitCron;
