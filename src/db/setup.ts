import { readFileSync } from 'fs';
import { join } from 'path';
import { query, pool } from './index';

export async function setupDatabase(): Promise<void> {
  try {
    console.log('Setting up database...');
    
    // Use a transaction to ensure atomic setup
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // List of migration files in order
      const migrations = [
        '001_create_users_table.sql',
        '002_add_role_column.sql', 
        '003_create_subjects_table.sql',
        '004_create_time_entries_table.sql',
        '005_update_time_entries_table.sql'
      ];
      
      // Execute each migration
      for (const migration of migrations) {
        const migrationPath = join(__dirname, 'migrations', migration);
        const migrationSQL = readFileSync(migrationPath, 'utf8');
        
        try {
          await client.query(migrationSQL);
          console.log(`Executed migration: ${migration}`);
        } catch (error: any) {
          // Handle case where constraint/index already exists (common in test environments)
          if (error.code === '42P07' && error.message.includes('already exists')) {
            console.log(`Migration ${migration} already applied, skipping`);
          } else {
            console.error(`Failed to execute migration ${migration}:`, error);
            throw error;
          }
        }
      }
      
      await client.query('COMMIT');
      console.log('Database setup completed successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database setup failed:', error);
    throw error;
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('Setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}
