// src/config/addLanguageColumn.js
import pool from './database.js';

const addLanguageColumn = async () => {
  try {
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en';
    `);

    console.log('✅ Language column added successfully');
  } catch (error) {
    console.error('❌ Error adding language column:', error);
  } finally {
    // Always close the database pool
    await pool.end();
    process.exit();
  }
};

// Run the script
addLanguageColumn();
