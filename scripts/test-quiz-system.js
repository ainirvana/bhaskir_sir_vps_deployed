const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testQuizSystem() {
  try {
    console.log('Testing quiz system...\n');
    
    // Check if we can fetch quizzes
    const quizzesResult = await pool.query(`
      SELECT id, title, description, is_published, 
             jsonb_array_length(COALESCE(quiz_data->'questions', '[]'::jsonb)) as question_count
      FROM quizzes 
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    
    console.log(`Found ${quizzesResult.rows.length} quizzes in database:`);
    quizzesResult.rows.forEach((quiz, index) => {
      console.log(`${index + 1}. ${quiz.title} (${quiz.question_count || 0} questions) - ${quiz.is_published ? 'Published' : 'Draft'}`);
    });
    
    // Test fetching a specific quiz
    if (quizzesResult.rows.length > 0) {
      const firstQuiz = quizzesResult.rows[0];
      console.log(`\nTesting fetch of quiz: ${firstQuiz.title}`);
      
      const quizDetailResult = await pool.query(`
        SELECT * FROM quizzes WHERE id = $1
      `, [firstQuiz.id]);
      
      if (quizDetailResult.rows.length > 0) {
        const quiz = quizDetailResult.rows[0];
        console.log('✅ Quiz fetch successful');
        console.log(`   Title: ${quiz.title}`);
        console.log(`   Questions: ${quiz.quiz_data?.questions?.length || 0}`);
        console.log(`   Published: ${quiz.is_published ? 'Yes' : 'No'}`);
        
        // Show first question if available
        if (quiz.quiz_data?.questions?.length > 0) {
          const firstQuestion = quiz.quiz_data.questions[0];
          console.log(`   First question: ${firstQuestion.question?.substring(0, 50)}...`);
        }
      } else {
        console.log('❌ Quiz fetch failed');
      }
    }
    
    console.log('\n✅ Quiz system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing quiz system:', error);
  } finally {
    await pool.end();
  }
}

testQuizSystem();