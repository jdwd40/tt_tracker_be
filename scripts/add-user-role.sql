-- Migration: Add role column to users table
-- Run this script to add role-based authentication support

-- Add role column with default value 'user'
ALTER TABLE users 
ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator'));

-- Create index on role for faster queries
CREATE INDEX idx_users_role ON users(role);

-- Update existing users to have 'user' role (if any exist)
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Add comment to document the role column
COMMENT ON COLUMN users.role IS 'User role for authorization: user, admin, or moderator';
