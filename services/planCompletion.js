import cron from "node-cron";
import Investment from "../models/Investment.js";
import User from "../models/User.js";

const startPlanCompletion = () => {
  // Runs every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    console.log("🔍 Checking completed plans...");

    const now = new Date();

    const investments = await Investment.find({
      status: "running",
      endDate: { $lte: now }
    });

    for (const inv of investments) {
      const user = await User.findById(inv.user);
      if (!user) continue;

      // Return capital
      user.balance += inv.amount;

      inv.status = "completed";

      await user.save();
      await inv.save();
    }

    console.log("✅ Plan completion check done");
  });
};

export default startPlanCompletion;
