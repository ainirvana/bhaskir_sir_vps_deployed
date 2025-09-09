const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkQuizzes() {
  try {
    console.log('Checking quizzes in database...\n');
    
    const result = await pool.query(`
      SELECT id, title, description, is_published, created_at, 
             jsonb_array_length(COALESCE(quiz_data->'questions', '[]'::jsonb)) as question_count
      FROM quizzes 
      ORDER BY created_at DESC;
    `);
    
    if (result.rows.length === 0) {
      console.log('No quizzes found in database');
    } else {
      console.log(`Found ${result.rows.length} quizzes:`);
      result.rows.forEach((quiz, index) => {
        console.log(`\n${index + 1}. ${quiz.title}`);
        console.log(`   ID: ${quiz.id}`);
        console.log(`   Description: ${quiz.description || 'No description'}`);
        console.log(`   Questions: ${quiz.question_count || 0}`);
        console.log(`   Published: ${quiz.is_published ? 'Yes' : 'No'}`);
        console.log(`   Created: ${new Date(quiz.created_at).toLocaleDateString()}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking quizzes:', error);
  } finally {
    await pool.end();
  }
}

checkQuizzes();