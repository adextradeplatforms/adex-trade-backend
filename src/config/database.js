// src/config/database.js
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Use a single connection string from .env
const pool = new Pool({
  connectionString: process.env.MONGO_URI || process.env.DATABASE_URL, // adjust your env variable name
  ssl: {
    rejectUnauthorized: false, // needed if using cloud Postgres (Supabase, Heroku)
  },
});

pool.on("connect", () => {
  console.log("✅ Database connected successfully");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected database error:", err);
  process.exit(-1);
});

export default pool;
