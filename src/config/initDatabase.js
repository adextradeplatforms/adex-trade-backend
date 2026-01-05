// src/config/initDatabase.js
import pool from './database.js';

const createTables = async () => {
  try {
    console.log('🔄 Creating database tables...');

    // Enable UUID extension
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        phone VARCHAR(50),

        email_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        verification_expires TIMESTAMP,

        referral_code VARCHAR(20) UNIQUE NOT NULL,
        referred_by UUID REFERENCES users(id),

        is_active BOOLEAN DEFAULT TRUE,
        is_admin BOOLEAN DEFAULT FALSE,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      );
    `);

    // Wallets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,

        balance NUMERIC(20,8) DEFAULT 0,
        invested_amount NUMERIC(20,8) DEFAULT 0,
        total_profit NUMERIC(20,8) DEFAULT 0,
        total_referral_bonus NUMERIC(20,8) DEFAULT 0,

        deposit_address VARCHAR(255),

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Investment plans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS investment_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) UNIQUE NOT NULL,
        daily_profit_rate NUMERIC(5,2) NOT NULL,
        min_investment NUMERIC(20,8) NOT NULL,
        max_investment NUMERIC(20,8),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add UNIQUE constraint to name if it doesn’t exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM pg_constraint 
          WHERE conname = 'investment_plans_name_key'
        ) THEN
          ALTER TABLE investment_plans ADD CONSTRAINT investment_plans_name_key UNIQUE(name);
        END IF;
      END
      $$;
    `);

    // User investments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_investments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        plan_id UUID REFERENCES investment_plans(id),

        invested_amount NUMERIC(20,8) NOT NULL,
        daily_profit_rate NUMERIC(5,2) NOT NULL,

        total_profit_earned NUMERIC(20,8) DEFAULT 0,
        last_profit_calculation TIMESTAMP,

        status VARCHAR(20) DEFAULT 'active',

        started_at TIMESTAMP DEFAULT NOW(),
        stopped_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,

        type VARCHAR(20) NOT NULL,
        amount NUMERIC(20,8) NOT NULL,
        fee NUMERIC(20,8) DEFAULT 0,
        net_amount NUMERIC(20,8) NOT NULL,

        status VARCHAR(20) DEFAULT 'pending',

        tx_hash VARCHAR(255),
        from_address VARCHAR(255),
        to_address VARCHAR(255),

        approved_by UUID REFERENCES users(id),
        approved_at TIMESTAMP,
        rejection_reason TEXT,

        investment_id UUID REFERENCES user_investments(id),
        referral_user_id UUID REFERENCES users(id),

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Referral tree table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referral_tree (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        level INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, referred_user_id)
      );
    `);

    // Referral commissions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referral_commissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        from_user_id UUID REFERENCES users(id),
        transaction_id UUID REFERENCES transactions(id),

        level INTEGER NOT NULL,
        commission_rate NUMERIC(5,2) NOT NULL,
        commission_amount NUMERIC(20,8) NOT NULL,

        type VARCHAR(20) NOT NULL,

        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Admin settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Profit calculations log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profit_calculations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        investment_id UUID REFERENCES user_investments(id),
        user_id UUID REFERENCES users(id),

        calculated_profit NUMERIC(20,8) NOT NULL,
        calculation_start TIMESTAMP NOT NULL,
        calculation_end TIMESTAMP NOT NULL,
        hours_elapsed NUMERIC(10,4) NOT NULL,

        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Insert default investment plans safely
    await pool.query(`
      INSERT INTO investment_plans (name, daily_profit_rate, min_investment, max_investment)
      VALUES
        ('VEXT Robot', 2.00, 20.00000000, NULL),
        ('Quantum Boost', 2.50, 100.00000000, NULL),
        ('Alpha Trader', 3.00, 500.00000000, NULL)
      ON CONFLICT (name) DO NOTHING;
    `);

    console.log('✅ All tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
};

createTables();
