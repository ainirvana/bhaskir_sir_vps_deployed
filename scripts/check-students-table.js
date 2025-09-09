const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkStudentsTable() {
  try {
    console.log('Checking users table for students...\n');
    
    const students = await pool.query(`
      SELECT * FROM users WHERE role = 'student' LIMIT 1;
    `);
    
    if (students.rows.length > 0) {
      console.log('Sample student record:');
      console.log(students.rows[0]);
    } else {
      console.log('No students found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkStudentsTable();