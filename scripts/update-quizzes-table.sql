-- Add missing columns to quizzes table
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS quiz_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS questions_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Update questions_count based on quiz_data
UPDATE public.quizzes 
SET questions_count = COALESCE(jsonb_array_length(quiz_data->'questions'), jsonb_array_length(questions), 0)
WHERE questions_count = 0;

-- Update time_limit based on questions_count (1 minute per question)
UPDATE public.quizzes 
SET time_limit = GREATEST(questions_count, 10)
WHERE time_limit = 30 AND questions_count > 0;

-- Ensure quiz_data has proper structure
UPDATE public.quizzes 
SET quiz_data = jsonb_build_object(
    'questions', COALESCE(quiz_data->'questions', questions, '[]'::jsonb),
    'quizTitle', title,
    'quizSynopsis', COALESCE(description, 'Quiz based on educational articles'),
    'nrOfQuestions', questions_count::text
)
WHERE quiz_data = '{}'::jsonb OR quiz_data IS NULL;