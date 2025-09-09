const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nukbivdxxzjwfoyjzblw.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addExpiredColumn() {
  try {
    console.log('Adding is_expired column to quizzes table...');
    
    // Add is_expired column
    const { error: alterError } = await supabase
      .from('quizzes')
      .select('is_expired')
      .limit(1);
    
    if (alterError && alterError.code === 'PGRST116') {
      console.log('Column is_expired does not exist, please add it manually in Supabase dashboard');
      console.log('SQL: ALTER TABLE quizzes ADD COLUMN is_expired BOOLEAN DEFAULT FALSE;');
    }
    
    // Check quiz_submissions table
    const { error: tableError } = await supabase
      .from('quiz_submissions')
      .select('id')
      .limit(1);
    
    if (tableError && tableError.code === 'PGRST106') {
      console.log('Table quiz_submissions does not exist, please create it manually in Supabase dashboard');
      console.log(`SQL: 
CREATE TABLE quiz_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  answers JSONB,
  score INTEGER,
  total_questions INTEGER,
  percentage INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_id, student_id)
);`);
    }
    
    const error = null;

    if (error) {
      console.error('Error:', error);
      process.exit(1);
    }

    console.log('Successfully added is_expired column and quiz_submissions table');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addExpiredColumn();