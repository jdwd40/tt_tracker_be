import { Pool, PoolClient, QueryResult } from 'pg';
import { env } from '../config/env';

// Create database pool
export const pool = new Pool({
  connectionString: env.POSTGRES_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Parameterized query helper
export async function query<T extends Record<string, any> = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  // Log slow queries in development
  if (env.NODE_ENV === 'development' && duration > 100) {
    console.warn(`Slow query (${duration}ms):`, text);
  }

  return result;
}

// Get a client from the pool for transactions
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

// Test database connection
export async function testConnection(): Promise<void> {
  try {
    await query('SELECT NOW()');
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  await pool.end();
}
