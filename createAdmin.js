import dotenv from "dotenv";
import connectDB from "./config/db.js";
import User from "./models/User.js";

dotenv.config();
connectDB();

const createAdmin = async () => {
  try {
    const adminExists = await User.findOne({ email: "admin@example.com" });
    if (adminExists) return console.log("Admin already exists");

    const admin = await User.create({
      name: "Admin",
      email: "admin@example.com",
      password: "AdminStrongPass123!",
      role: "admin",
    });

    console.log("✅ Admin created successfully:");
    console.log("Email:", admin.email);
    console.log("Password: AdminStrongPass123!");
    process.exit();
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
};

createAdmin();
