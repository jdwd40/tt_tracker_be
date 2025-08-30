#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Environment template
const ENV_TEMPLATE = `# Database
POSTGRES_URL=postgresql://jd:K1ller1921@localhost:5432/time_tracker

# JWT Secrets (generate secure random strings)
JWT_ACCESS_SECRET=your-super-secure-access-secret-key-32-chars-minimum
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-32-chars-minimum

# Environment
NODE_ENV=development
`;

const TEST_ENV_TEMPLATE = `# Test Database
POSTGRES_URL=postgresql://jd:K1ller1921@localhost:5432/time_tracker_test

# JWT Secrets (generate secure random strings)
JWT_ACCESS_SECRET=your-super-secure-access-secret-key-32-chars-minimum
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-32-chars-minimum

# Environment
NODE_ENV=test
`;

function createEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    console.log('ℹ️  .env file already exists, skipping...');
    return;
  }

  try {
    fs.writeFileSync(envPath, ENV_TEMPLATE);
    console.log('✅ Created .env file with database configuration');
    console.log('📝 Please update the JWT secrets with secure random strings');
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
  }
}

function createTestEnvFile() {
  const testEnvPath = path.join(process.cwd(), 'tests', 'test.env');
  
  // Ensure tests directory exists
  const testsDir = path.dirname(testEnvPath);
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
  }

  if (fs.existsSync(testEnvPath)) {
    console.log('ℹ️  tests/test.env file already exists, skipping...');
    return;
  }

  try {
    fs.writeFileSync(testEnvPath, TEST_ENV_TEMPLATE);
    console.log('✅ Created tests/test.env file for test database');
  } catch (error) {
    console.error('❌ Error creating tests/test.env file:', error.message);
  }
}

function main() {
  console.log('🔧 Setting up environment files...\n');
  
  createEnvFile();
  createTestEnvFile();
  
  console.log('\n📋 Next steps:');
  console.log('1. Update the JWT secrets in .env with secure random strings');
  console.log('2. Run: npm run db:setup');
  console.log('3. Run: npm run dev');
}

if (require.main === module) {
  main();
}

module.exports = { createEnvFile, createTestEnvFile };
