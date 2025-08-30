#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'jd',
  password: 'K1ller1921',
};

const MAIN_DB = 'time_tracker';
const TEST_DB = 'time_tracker_test';

// SQL for creating tables
const CREATE_TABLES_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/London',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(60) NOT NULL,
  color VARCHAR(7),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, LOWER(name))
);

-- Time entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 1 AND duration_minutes <= 1440),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user_name ON subjects(user_id, LOWER(name));
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_subject_date ON time_entries(user_id, subject_id, date);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_subject_id ON time_entries(subject_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

// Seed data for main database
const SEED_DATA_SQL = `
-- Create a test user
INSERT INTO users (email, password_hash, timezone) VALUES 
('test@example.com', '$2b$10$rQZ8N3YqK9vL2mN1pO7iAeF6gH8jK4lM9nO2pQ5rS8tU1vW3xY6zA7bC4dE1fG', 'Europe/London')
ON CONFLICT (email) DO NOTHING;

-- Create subjects for the test user
INSERT INTO subjects (user_id, name, color) 
SELECT id, 'Work', '#3B82F6' FROM users WHERE email = 'test@example.com'
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO subjects (user_id, name, color) 
SELECT id, 'Study', '#10B981' FROM users WHERE email = 'test@example.com'
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO subjects (user_id, name, color) 
SELECT id, 'Exercise', '#F59E0B' FROM users WHERE email = 'test@example.com'
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO subjects (user_id, name, color) 
SELECT id, 'Reading', '#8B5CF6' FROM users WHERE email = 'test@example.com'
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO subjects (user_id, name, color) 
SELECT id, 'Coding', '#EF4444' FROM users WHERE email = 'test@example.com'
ON CONFLICT (user_id, name) DO NOTHING;

-- Create time entries for the last 7 days
INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
SELECT u.id, s.id, CURRENT_DATE - INTERVAL '6 days', 480, 'Productive day'
FROM users u, subjects s 
WHERE u.email = 'test@example.com' AND s.name = 'Work' AND s.user_id = u.id;

INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
SELECT u.id, s.id, CURRENT_DATE - INTERVAL '5 days', 420, 'Team meeting'
FROM users u, subjects s 
WHERE u.email = 'test@example.com' AND s.name = 'Work' AND s.user_id = u.id;

INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
SELECT u.id, s.id, CURRENT_DATE - INTERVAL '6 days', 120, 'TypeScript learning'
FROM users u, subjects s 
WHERE u.email = 'test@example.com' AND s.name = 'Study' AND s.user_id = u.id;

INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
SELECT u.id, s.id, CURRENT_DATE - INTERVAL '4 days', 90, 'Database design'
FROM users u, subjects s 
WHERE u.email = 'test@example.com' AND s.name = 'Study' AND s.user_id = u.id;

INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
SELECT u.id, s.id, CURRENT_DATE - INTERVAL '6 days', 60, 'Morning run'
FROM users u, subjects s 
WHERE u.email = 'test@example.com' AND s.name = 'Exercise' AND s.user_id = u.id;

INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
SELECT u.id, s.id, CURRENT_DATE - INTERVAL '4 days', 45, 'Gym session'
FROM users u, subjects s 
WHERE u.email = 'test@example.com' AND s.name = 'Exercise' AND s.user_id = u.id;

INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
SELECT u.id, s.id, CURRENT_DATE - INTERVAL '5 days', 30, 'API documentation'
FROM users u, subjects s 
WHERE u.email = 'test@example.com' AND s.name = 'Reading' AND s.user_id = u.id;

INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
SELECT u.id, s.id, CURRENT_DATE - INTERVAL '3 days', 180, 'Backend development'
FROM users u, subjects s 
WHERE u.email = 'test@example.com' AND s.name = 'Coding' AND s.user_id = u.id;

INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
SELECT u.id, s.id, CURRENT_DATE - INTERVAL '2 days', 240, 'Feature implementation'
FROM users u, subjects s 
WHERE u.email = 'test@example.com' AND s.name = 'Coding' AND s.user_id = u.id;

INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
SELECT u.id, s.id, CURRENT_DATE - INTERVAL '1 day', 360, 'Code review'
FROM users u, subjects s 
WHERE u.email = 'test@example.com' AND s.name = 'Work' AND s.user_id = u.id;

INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
SELECT u.id, s.id, CURRENT_DATE - INTERVAL '1 day', 60, 'Testing strategies'
FROM users u, subjects s 
WHERE u.email = 'test@example.com' AND s.name = 'Study' AND s.user_id = u.id;
`;

// Test seed data (more extensive for testing)
const TEST_SEED_DATA_SQL = `
-- Create multiple test users
INSERT INTO users (email, password_hash, timezone) VALUES 
('user1@test.com', '$2b$10$rQZ8N3YqK9vL2mN1pO7iAeF6gH8jK4lM9nO2pQ5rS8tU1vW3xY6zA7bC4dE1fG', 'Europe/London'),
('user2@test.com', '$2b$10$rQZ8N3YqK9vL2mN1pO7iAeF6gH8jK4lM9nO2pQ5rS8tU1vW3xY6zA7bC4dE1fG', 'America/New_York'),
('user3@test.com', '$2b$10$rQZ8N3YqK9vL2mN1pO7iAeF6gH8jK4lM9nO2pQ5rS8tU1vW3xY6zA7bC4dE1fG', 'Asia/Tokyo')
ON CONFLICT (email) DO NOTHING;

-- Create subjects for user1
INSERT INTO subjects (user_id, name, color) 
SELECT id, 'Development', '#3B82F6' FROM users WHERE email = 'user1@test.com'
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO subjects (user_id, name, color) 
SELECT id, 'Testing', '#10B981' FROM users WHERE email = 'user1@test.com'
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO subjects (user_id, name, color) 
SELECT id, 'Documentation', '#F59E0B' FROM users WHERE email = 'user1@test.com'
ON CONFLICT (user_id, name) DO NOTHING;

-- Create subjects for user2
INSERT INTO subjects (user_id, name, color) 
SELECT id, 'Design', '#8B5CF6' FROM users WHERE email = 'user2@test.com'
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO subjects (user_id, name, color) 
SELECT id, 'Research', '#EF4444' FROM users WHERE email = 'user2@test.com'
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO subjects (user_id, name, color) 
SELECT id, 'Planning', '#06B6D4' FROM users WHERE email = 'user2@test.com'
ON CONFLICT (user_id, name) DO NOTHING;

-- Create subjects for user3
INSERT INTO subjects (user_id, name, color) 
SELECT id, 'Analysis', '#84CC16' FROM users WHERE email = 'user3@test.com'
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO subjects (user_id, name, color) 
SELECT id, 'Implementation', '#F97316' FROM users WHERE email = 'user3@test.com'
ON CONFLICT (user_id, name) DO NOTHING;

INSERT INTO subjects (user_id, name, color) 
SELECT id, 'Review', '#EC4899' FROM users WHERE email = 'user3@test.com'
ON CONFLICT (user_id, name) DO NOTHING;

-- Create sample time entries for user1
INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
SELECT u.id, s.id, CURRENT_DATE - INTERVAL '1 day', 240, 'Sample development work'
FROM users u, subjects s 
WHERE u.email = 'user1@test.com' AND s.name = 'Development' AND s.user_id = u.id;

INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
SELECT u.id, s.id, CURRENT_DATE - INTERVAL '2 days', 120, 'Sample testing work'
FROM users u, subjects s 
WHERE u.email = 'user1@test.com' AND s.name = 'Testing' AND s.user_id = u.id;

-- Create sample time entries for user2
INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
SELECT u.id, s.id, CURRENT_DATE - INTERVAL '1 day', 180, 'Sample design work'
FROM users u, subjects s 
WHERE u.email = 'user2@test.com' AND s.name = 'Design' AND s.user_id = u.id;

INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
SELECT u.id, s.id, CURRENT_DATE - INTERVAL '2 days', 90, 'Sample research work'
FROM users u, subjects s 
WHERE u.email = 'user2@test.com' AND s.name = 'Research' AND s.user_id = u.id;

-- Create sample time entries for user3
INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
SELECT u.id, s.id, CURRENT_DATE - INTERVAL '1 day', 300, 'Sample analysis work'
FROM users u, subjects s 
WHERE u.email = 'user3@test.com' AND s.name = 'Analysis' AND s.user_id = u.id;

INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
SELECT u.id, s.id, CURRENT_DATE - INTERVAL '2 days', 150, 'Sample implementation work'
FROM users u, subjects s 
WHERE u.email = 'user3@test.com' AND s.name = 'Implementation' AND s.user_id = u.id;
`;

async function createDatabase(dbName) {
  const client = new Client({
    ...DB_CONFIG,
    database: 'postgres', // Connect to default postgres database
  });

  try {
    await client.connect();
    console.log(`🔗 Connected to PostgreSQL as ${DB_CONFIG.user}`);

    // Check if database exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (result.rows.length === 0) {
      console.log(`📦 Creating database: ${dbName}`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database ${dbName} created successfully`);
    } else {
      console.log(`🗑️  Dropping existing database: ${dbName}`);
      await client.query(`DROP DATABASE ${dbName}`);
      console.log(`📦 Creating database: ${dbName}`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database ${dbName} recreated successfully`);
    }
  } catch (error) {
    console.error(`❌ Error creating database ${dbName}:`, error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function setupDatabase(dbName, seedData = false) {
  const client = new Client({
    ...DB_CONFIG,
    database: dbName,
  });

  try {
    await client.connect();
    console.log(`🔗 Connected to database: ${dbName}`);

    // Create tables step by step
    console.log(`📋 Creating tables in ${dbName}...`);
    
    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/London',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Create subjects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(60) NOT NULL,
        color VARCHAR(7),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, name)
      );
    `);
    
    // Create time entries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 1 AND duration_minutes <= 1440),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_subjects_user_name ON subjects(user_id, name)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON time_entries(user_id, date)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_time_entries_user_subject_date ON time_entries(user_id, subject_id, date)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_time_entries_subject_id ON time_entries(subject_id)');
    
    // Create trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // Create triggers
    await client.query('CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()');
    await client.query('CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()');
    await client.query('CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()');
    
    console.log(`✅ Tables created successfully`);

    // Add seed data if requested
    if (seedData) {
      console.log(`🌱 Adding seed data to ${dbName}...`);
      if (dbName === TEST_DB) {
        await client.query(TEST_SEED_DATA_SQL);
      } else {
        await client.query(SEED_DATA_SQL);
      }
      console.log(`✅ Seed data added successfully`);
    }

  } catch (error) {
    console.error(`❌ Error setting up database ${dbName}:`, error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🚀 Starting database setup...\n');

  try {
    // Create main database
    await createDatabase(MAIN_DB);
    await setupDatabase(MAIN_DB, true);

    console.log('\n' + '='.repeat(50) + '\n');

    // Create test database
    await createDatabase(TEST_DB);
    await setupDatabase(TEST_DB, true);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Database setup completed successfully!');
    console.log('\n📊 Databases created:');
    console.log(`   • ${MAIN_DB} (main database with sample data)`);
    console.log(`   • ${TEST_DB} (test database with extensive test data)`);
    console.log('\n🔑 Test credentials:');
    console.log('   • Email: test@example.com');
    console.log('   • Password: password123 (hashed in database)');
    console.log('\n📝 Next steps:');
    console.log('   1. Update your .env file with the correct database URLs');
    console.log('   2. Run: npm run dev');
    console.log('   3. Test the health endpoint: curl http://localhost:3000/healthz');

  } catch (error) {
    console.error('\n💥 Database setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  main();
}

module.exports = { createDatabase, setupDatabase };
