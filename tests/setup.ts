import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { vi } from 'vitest';
import request from 'supertest';
import dotenv from 'dotenv';
import path from 'path';
import app from '../src/app';
import { pool } from '../src/db';
import { setupDatabase } from '../src/db/setup';
import { tokenStore } from '../src/modules/auth/tokenStore';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, 'test.env') });

// Set timezone to Europe/London for consistent date handling
process.env.TZ = 'Europe/London';

// Freeze time helper
export function freezeTime(date: Date | string): void {
  const timestamp = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  vi.setSystemTime(timestamp);
}

// Unfreeze time helper
export function unfreezeTime(): void {
  vi.useRealTimers();
}

// Test app instance
export const testApp = app;

// Supertest helper
export function createTestClient() {
  return request(testApp);
}

// Database helpers for tests
export async function clearDatabase(): Promise<void> {
  // Clear all data from tables
  await pool.query('DELETE FROM refresh_token_blacklist');
  await pool.query('DELETE FROM users');
  
  // Clear token store
  tokenStore.clear();
}

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Setup database schema
  try {
    await setupDatabase();
  } catch (error) {
    console.error('Test database setup failed:', error);
    throw error;
  }
});

// Global test teardown
afterAll(async () => {
  await pool.end();
});

// Per-test setup
beforeEach(async () => {
  // Clear any frozen time
  unfreezeTime();
  
  // Clear database state (will be implemented with migrations)
  await clearDatabase();
});

// Per-test teardown
afterEach(() => {
  // Unfreeze time after each test
  unfreezeTime();
});
