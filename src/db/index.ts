import { Pool, PoolClient, QueryResult } from 'pg';
import { env } from '../config/env';

// Build connection configuration
function buildConnectionConfig() {
  // Prefer connection string if provided
  if (env.POSTGRES_URL) {
    return {
      connectionString: env.POSTGRES_URL,
    };
  }
  
  // Otherwise use individual environment variables
  if (!env.POSTGRES_HOST || !env.POSTGRES_DB || !env.POSTGRES_USER || !env.POSTGRES_PASSWORD) {
    throw new Error('Database configuration incomplete. Either provide POSTGRES_URL or all individual database environment variables.');
  }
  
  return {
    host: env.POSTGRES_HOST,
    port: parseInt(env.POSTGRES_PORT || '5432'),
    database: env.POSTGRES_DB,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
  };
}

// Create database pool
export const pool = new Pool({
  ...buildConnectionConfig(),
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
