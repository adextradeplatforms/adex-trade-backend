import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config(); // loads MONGO_URI from .env

async function deleteAllUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await User.deleteMany({});
    console.log("✅ All users deleted");
    process.exit();
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

deleteAllUsers();
