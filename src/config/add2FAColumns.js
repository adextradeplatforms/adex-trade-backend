// src/config/add2FAColumns.js
import pool from './database.js';

const add2FAColumns = async () => {
  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);
    `);

    console.log('✅ 2FA columns added successfully');
  } catch (error) {
    console.error('❌ Error adding 2FA columns:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
    process.exit(0);
  }
};

add2FAColumns();
