-- Create quiz_submissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.quiz_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID NOT NULL,
    student_id TEXT NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    score INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add RLS policies
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on quiz_submissions" ON public.quiz_submissions
    FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_id ON public.quiz_submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student_id ON public.quiz_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_submitted_at ON public.quiz_submissions(submitted_at);

-- Add foreign key constraint to quizzes table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quizzes') THEN
        ALTER TABLE public.quiz_submissions 
        ADD CONSTRAINT fk_quiz_submissions_quiz_id 
        FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;
    END IF;
END $$;