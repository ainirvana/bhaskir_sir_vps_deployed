const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixStudentSchema() {
  try {
    console.log('Fixing student management schema...\n');
    
    // 1. Drop and recreate student_invitations table with correct structure
    console.log('Recreating student_invitations table...');
    
    await pool.query('DROP TABLE IF EXISTS student_invitations CASCADE');
    
    await pool.query(`
      CREATE TABLE student_invitations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        invite_code TEXT NOT NULL UNIQUE,
        student_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        is_registered BOOLEAN DEFAULT false,
        is_password_reset BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    // 2. Ensure users table has password column
    console.log('Adding password column to users table...');
    
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password TEXT;
    `);
    
    // 3. Create indexes for better performance
    console.log('Creating indexes...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_student_invitations_email ON student_invitations(email);
      CREATE INDEX IF NOT EXISTS idx_student_invitations_code ON student_invitations(invite_code);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);
    
    console.log('✅ Schema fixed successfully');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

fixStudentSchema();