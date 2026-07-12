-- Seed initial admin user for Maestro
-- This script creates the initial admin account if it doesn't already exist
-- Username: yumesorai
-- Email: admin@yumesorai.com
-- Password: YumeSorai123!
-- Password Hash: $2b$12$/mluxzkjExOJiT2jw7cycOJI6sRvnNvN8uW/uHItYossV.2bYEx2W

INSERT INTO admin_users (username, password_hash, email, full_name, is_active, created_at, updated_at)
VALUES (
  'yumesorai',
  '$2b$12$/mluxzkjExOJiT2jw7cycOJI6sRvnNvN8uW/uHItYossV.2bYEx2W',
  'admin@yumesorai.com',
  'Initial Admin',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO UPDATE SET
  password_hash = '$2b$12$/mluxzkjExOJiT2jw7cycOJI6sRvnNvN8uW/uHItYossV.2bYEx2W',
  updated_at = CURRENT_TIMESTAMP;

-- Verify the admin user was created
SELECT id, username, email, full_name, is_active, created_at FROM admin_users WHERE username = 'yumesorai';
