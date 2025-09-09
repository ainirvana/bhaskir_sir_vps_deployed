-- SQL script to create demo user profiles in Supabase
-- You'll still need to create the corresponding Firebase Auth users manually

-- Insert demo admin user
INSERT INTO users (
  id,
  email,
  role,
  full_name,
  display_name,
  is_active,
  created_at,
  updated_at
) VALUES (
  'demo-admin-123',
  'admin@eduplatform.com',
  'admin',
  'Demo Administrator',
  'Admin Demo',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- Insert demo student user
INSERT INTO users (
  id,
  email,
  role,
  full_name,
  display_name,
  is_active,
  created_at,
  updated_at
) VALUES (
  'demo-student-123',
  'student@eduplatform.com',
  'student',
  'Demo Student',
  'Student Demo',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- Verify the users were created
SELECT 
  id,
  email,
  role,
  full_name,
  display_name,
  is_active,
  created_at
FROM users 
WHERE email IN ('admin@eduplatform.com', 'student@eduplatform.com')
ORDER BY role;
