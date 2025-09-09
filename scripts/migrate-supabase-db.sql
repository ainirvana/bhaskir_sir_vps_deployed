-- Comprehensive database migration script to update schema for educational platform
-- This ensures all tables exist with proper structure for the external Supabase PostgreSQL database

-- Create extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure users table exists
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure student_invitations table exists
CREATE TABLE IF NOT EXISTS student_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  student_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  is_registered BOOLEAN NOT NULL DEFAULT false,
  password_reset_requested BOOLEAN NOT NULL DEFAULT false,
  invited_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure scraped_content table exists
CREATE TABLE IF NOT EXISTS scraped_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure quiz_attempts table exists
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  quiz_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  answers JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure slide_directories table exists
CREATE TABLE IF NOT EXISTS slide_directories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  directory_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure slides table exists with all required fields
CREATE TABLE IF NOT EXISTS slides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content JSONB,
  body_content TEXT,
  image_url TEXT,
  type TEXT DEFAULT 'standard',
  slide_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  directory_id UUID REFERENCES slide_directories(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add any missing columns to slides table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'slides' AND column_name = 'body_content') THEN
        ALTER TABLE slides ADD COLUMN body_content TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'slides' AND column_name = 'image_url') THEN
        ALTER TABLE slides ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_slides_directory_id ON slides(directory_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_slide_directories_published ON slide_directories(is_published);

-- Sample data for testing
INSERT INTO users (firebase_uid, email, full_name, role)
SELECT 'admin-test', 'admin@test.com', 'Test Administrator', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@test.com');

INSERT INTO users (firebase_uid, email, full_name, role)
SELECT 'student-test', 'student@test.com', 'Test Student', 'student'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'student@test.com');
