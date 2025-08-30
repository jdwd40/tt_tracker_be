import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from './index';

export async function setupDatabase(): Promise<void> {
  try {
    console.log('Setting up database...');
    
    // Read and execute the migration
    const migrationPath = join(__dirname, 'migrations', '001_create_users_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await query(migrationSQL);
    
    console.log('Database setup completed successfully');
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
