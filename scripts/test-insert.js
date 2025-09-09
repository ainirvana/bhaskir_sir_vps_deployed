const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testInsert() {
  try {
    console.log('Testing insert into student_invitations...\n');
    
    const testData = {
      email: 'test@example.com',
      invite_code: 'TEST123456',
      student_id: 'TEST001',
      full_name: 'Test Student',
      is_registered: false,
      password_reset_requested: false
    };
    
    const result = await pool.query(`
      INSERT INTO student_invitations (email, invite_code, student_id, full_name, is_registered, password_reset_requested)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `, [testData.email, testData.invite_code, testData.student_id, testData.full_name, testData.is_registered, testData.password_reset_requested]);
    
    console.log('✅ Insert successful:', result.rows[0]);
    
    // Clean up
    await pool.query('DELETE FROM student_invitations WHERE invite_code = $1', ['TEST123456']);
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Insert failed:', error);
  } finally {
    await pool.end();
  }
}

testInsert();