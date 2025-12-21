import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // No need for useNewUrlParser or useUnifiedTopology in Mongoose v6+
    });
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
};

export default connectDB;
