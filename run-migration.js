const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './tests/test.env' });

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
  });

  try {
    console.log('Running migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'src/db/migrations/001_create_users_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Migration SQL:', migrationSQL);
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('Migration completed successfully');
    
    // Verify tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'refresh_token_blacklist')
    `);
    
    console.log('Tables created:', tablesResult.rows.map(r => r.table_name));
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
