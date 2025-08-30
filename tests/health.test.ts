import { describe, it, expect } from 'vitest';
import { createTestClient } from './setup';

describe('Health Check', () => {
  it('should return 200 for healthz endpoint', async () => {
    const client = createTestClient();
    
    const response = await client.get('/healthz');
    
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
    });
  });

  it('should return 404 for unknown routes', async () => {
    const client = createTestClient();
    
    const response = await client.get('/unknown-route');
    
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: {
        code: 'NOT_FOUND',
        message: expect.stringContaining('Route GET /unknown-route not found'),
      },
    });
  });
});
