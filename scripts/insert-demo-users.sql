-- Insert demo user profiles
-- Note: These users should already exist in Firebase Auth

-- Insert admin user
INSERT INTO users (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin@eduplatform.com',
  'Admin Teacher',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Insert student user
INSERT INTO users (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'student@eduplatform.com',
  'Demo Student',
  'student',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Verify the users were created
SELECT id, email, full_name, role, created_at FROM users WHERE email IN ('admin@eduplatform.com', 'student@eduplatform.com');
