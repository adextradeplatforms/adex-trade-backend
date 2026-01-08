// deleteUsersPostgres.js
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const deleteAllUsers = async () => {
  try {
    const res = await pool.query('DELETE FROM users');
    console.log(`🗑️ Deleted ${res.rowCount} users`);
    await pool.end();
  } catch (err) {
    console.error(err);
  }
};

deleteAllUsers();
