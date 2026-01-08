import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const deleteAllUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Database connected');

    const result = await User.deleteMany({});
    console.log(`🗑️ Deleted ${result.deletedCount} users`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

deleteAllUsers();
