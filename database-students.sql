-- Create students table to store actual student information
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample student data
INSERT INTO students (id, name, email) VALUES 
('student_1', 'Niket Singla', 'niket@example.com')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email;