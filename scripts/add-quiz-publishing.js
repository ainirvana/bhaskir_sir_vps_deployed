const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addQuizPublishing() {
  try {
    console.log('Adding publishing columns to quizzes table...');
    
    // Add publishing columns to quizzes table
    await pool.query(`
      ALTER TABLE quizzes 
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS quiz_data JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS created_by UUID,
      ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS published_by UUID;
    `);
    
    // Update existing quizzes to have proper quiz_data structure
    await pool.query(`
      UPDATE quizzes 
      SET quiz_data = jsonb_build_object('questions', questions)
      WHERE quiz_data = '{}'::jsonb OR quiz_data IS NULL;
    `);
    
    console.log('✅ Successfully added publishing columns to quizzes table');
    
    // Check the updated structure
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'quizzes' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nUpdated quizzes table structure:');
    columnsResult.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding publishing columns:', error);
  } finally {
    await pool.end();
  }
}

addQuizPublishing();