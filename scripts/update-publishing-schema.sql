-- Add publishing-related columns to existing tables

-- Add is_published column to scraped_content table
ALTER TABLE scraped_content 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id);

-- Create quizzes table for storing generated quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  quiz_data JSONB NOT NULL, -- Store the complete quiz structure
  article_ids UUID[] DEFAULT '{}', -- Array of article IDs used to create this quiz
  created_by UUID REFERENCES users(id) NOT NULL,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  published_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create presentations table for storing generated presentations
CREATE TABLE IF NOT EXISTS presentations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  presentation_data JSONB NOT NULL, -- Store the complete presentation structure
  article_ids UUID[] DEFAULT '{}', -- Array of article IDs used to create this presentation
  template_id VARCHAR(50),
  created_by UUID REFERENCES users(id) NOT NULL,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  published_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_attempts table for tracking student quiz attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  time_taken INTEGER, -- in seconds
  answers JSONB NOT NULL, -- Store detailed answers
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_id, student_id) -- One attempt per student per quiz
);

-- Add RLS policies for new tables
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Policies for quizzes table
CREATE POLICY "Admins can manage all quizzes" ON quizzes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.firebase_uid = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Students can view published quizzes" ON quizzes
  FOR SELECT USING (
    is_published = true OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.firebase_uid = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policies for presentations table
CREATE POLICY "Admins can manage all presentations" ON presentations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.firebase_uid = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Students can view published presentations" ON presentations
  FOR SELECT USING (
    is_published = true OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.firebase_uid = auth.util.firebase_uid() 
      AND users.role = 'admin'
    )
  );

-- Policies for quiz_attempts table
CREATE POLICY "Students can manage their own attempts" ON quiz_attempts
  FOR ALL USING (
    student_id = (
      SELECT id FROM users 
      WHERE users.firebase_uid = auth.uid()
    )
  );

CREATE POLICY "Admins can view all attempts" ON quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.firebase_uid = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Update RLS policy for scraped_content to consider publishing
DROP POLICY IF EXISTS "Users can view scraped content" ON scraped_content;
CREATE POLICY "Admins can manage all content" ON scraped_content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.firebase_uid = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Students can view published content" ON scraped_content
  FOR SELECT USING (
    is_published = true OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.firebase_uid = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scraped_content_published ON scraped_content(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_quizzes_published ON quizzes(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_presentations_published ON presentations(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id, completed_at);
