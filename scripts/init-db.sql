-- Drop existing tables if they exist
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS student_invitations CASCADE;
DROP TABLE IF EXISTS scraped_content CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create student_invitations table
CREATE TABLE student_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Create scraped_content table
CREATE TABLE scraped_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create quiz_attempts table
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  quiz_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  answers JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert sample data
INSERT INTO users (firebase_uid, email, full_name, role) VALUES
  ('admin-test', 'admin@test.com', 'Test Administrator', 'admin')
RETURNING id;

INSERT INTO users (firebase_uid, email, full_name, role) VALUES
  ('student-test', 'student@test.com', 'Test Student', 'student')
RETURNING id;
