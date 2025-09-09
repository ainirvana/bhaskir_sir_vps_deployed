const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function resetAndSeedAdmin() {
  try {
    console.log('Clearing all users...');
    
    // Clear related data first
    await pool.query('DELETE FROM student_invitations');
    await pool.query('DELETE FROM slide_directories');
    await pool.query('DELETE FROM slides');
    await pool.query('DELETE FROM quiz_attempts');
    
    // Clear all users
    await pool.query('DELETE FROM users');
    
    console.log('Creating admin user...');
    
    // Create admin user
    await pool.query(`
      INSERT INTO users (id, firebase_uid, email, role, full_name, created_at)
      VALUES (
        gen_random_uuid(),
        'careerexp@admin.com',
        'careerexp@admin.com',
        'admin',
        'Administrator',
        NOW()
      )
    `);
    
    console.log('✅ Successfully created admin user:');
    console.log('   Email: careerexp@admin.com');
    console.log('   Password: password');
    console.log('   Role: admin');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

resetAndSeedAdmin();