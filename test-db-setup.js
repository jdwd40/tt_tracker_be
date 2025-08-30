const { setupDatabase } = require('./src/db/setup');

async function testSetup() {
  try {
    console.log('Testing database setup...');
    await setupDatabase();
    console.log('✅ Database setup successful!');
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

testSetup();
