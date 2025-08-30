const { Pool } = require('pg');
require('dotenv').config({ path: './tests/test.env' });

async function testDb() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
  });

  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log('Database connected:', result.rows[0]);
    
    console.log('\nTesting users table...');
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    console.log('Users count:', usersResult.rows[0]);
    
    console.log('\nTesting blacklist table...');
    const blacklistResult = await pool.query('SELECT COUNT(*) FROM refresh_token_blacklist');
    console.log('Blacklist count:', blacklistResult.rows[0]);
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await pool.end();
  }
}

testDb();
