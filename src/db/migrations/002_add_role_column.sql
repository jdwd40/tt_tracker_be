-- Migration: Add role column to existing users table
-- This migration safely adds the role column to existing users tables

-- Add role column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator'));
    END IF;
END $$;

-- Create index on role if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add comment to document the role column
COMMENT ON COLUMN users.role IS 'User role for authorization: user, admin, or moderator';
