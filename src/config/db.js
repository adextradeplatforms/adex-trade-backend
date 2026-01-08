// src/config/db.js
import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // required for Supabase
  },
});

const connectDB = async () => {
  try {
    await pool.query('SELECT NOW()'); // simple test query
    console.log('✅ PostgreSQL Connected');
  } catch (err) {
    console.error('❌ PostgreSQL Connection Error:', err);
    process.exit(1);
  }
};

export { pool };
export default connectDB;
