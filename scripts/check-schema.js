const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkSchema() {
  try {
    console.log('Checking database schema...\n');
    
    // Check if quizzes table exists
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('quizzes', 'scraped_content', 'gk_today_content')
      ORDER BY table_name;
    `);
    
    console.log('Existing tables:', tablesResult.rows.map(r => r.table_name));
    
    // Check quizzes table structure if it exists
    if (tablesResult.rows.some(r => r.table_name === 'quizzes')) {
      console.log('\nQuizzes table structure:');
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'quizzes' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `);
      
      columnsResult.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
      
      // Check if there are any quizzes
      const countResult = await pool.query('SELECT COUNT(*) as count FROM quizzes');
      console.log(`\nNumber of quizzes in database: ${countResult.rows[0].count}`);
    } else {
      console.log('\nQuizzes table does not exist');
    }
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await pool.end();
  }
}

checkSchema();