-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/London',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on email for case-insensitive lookups
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- Create refresh token blacklist table for logout functionality
CREATE TABLE IF NOT EXISTS refresh_token_blacklist (
  token_hash VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on expires_at for cleanup
CREATE INDEX IF NOT EXISTS idx_refresh_token_blacklist_expires ON refresh_token_blacklist(expires_at);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_refresh_token_blacklist_user_id ON refresh_token_blacklist(user_id);
