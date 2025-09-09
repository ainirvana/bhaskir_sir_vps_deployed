-- Add quizzes table to existing schema
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    article_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add RLS policies
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on quizzes" ON public.quizzes
    FOR ALL USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON public.quizzes(created_at);
CREATE INDEX IF NOT EXISTS idx_quizzes_title ON public.quizzes(title);