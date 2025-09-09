const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function recreateAdmin() {
  try {
    console.log('Recreating admin user...\n');
    
    // Delete existing admin
    await pool.query("DELETE FROM users WHERE email = 'careerexp@admin.com'");
    
    // Create new admin
    await pool.query(`
      INSERT INTO users (firebase_uid, email, full_name, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
    `, ['careerexp@admin.com', 'careerexp@admin.com', 'Administrator', 'admin']);
    
    console.log('✅ Admin user recreated successfully');
    console.log('   Email: careerexp@admin.com');
    console.log('   Password: password');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

recreateAdmin();