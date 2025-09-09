const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addPasswordResetSupport() {
  try {
    console.log('Adding password reset support...');
    
    // Add password reset column to student_invitations table
    await pool.query(`
      ALTER TABLE student_invitations 
      ADD COLUMN IF NOT EXISTS is_password_reset BOOLEAN DEFAULT false;
    `);
    
    console.log('✅ Successfully added password reset support');
    
  } catch (error) {
    console.error('❌ Error adding password reset support:', error);
  } finally {
    await pool.end();
  }
}

addPasswordResetSupport();