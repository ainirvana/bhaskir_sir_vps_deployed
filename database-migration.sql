-- Add is_expired column to quizzes table
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE;

-- Create quiz_submissions table
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  answers JSONB,
  score INTEGER,
  total_questions INTEGER,
  percentage INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_id, student_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_id ON quiz_submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student_id ON quiz_submissions(student_id);