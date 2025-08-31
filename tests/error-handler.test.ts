import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ZodError } from 'zod';
import {
  errorMiddleware,
  notFoundHandler,
} from '../src/middleware/error';

// Create a minimal test app
const testApp = express();
testApp.use(express.json());

// Test routes
testApp.get('/test', (_req, res) => {
  res.json({ message: 'ok' });
});

testApp.get('/zod-error', (_req, res, next) => {
  const error = new ZodError([
    {
      code: 'invalid_type',
      expected: 'string',
      received: 'number',
      path: ['field'],
      message: 'Expected string, received number',
    },
  ]);
  next(error);
});

testApp.get('/app-error', (_req, res, next) => {
  const error = {
    httpStatus: 400,
    code: 'BAD_REQUEST',
    message: 'Test error',
    details: { field: 'test' }
  };
  next(error);
});

testApp.get('/unknown-error', (_req, res, next) => {
  next(new Error('Unknown error'));
});

// 404 handler
testApp.use(notFoundHandler);

// Error handler
testApp.use(errorMiddleware);

describe('Error Handler', () => {
  it('should handle Zod validation errors', async () => {
    const response = await request(testApp).get('/zod-error');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'BAD_REQUEST',
        message: 'Validation failed for fields: field',
        details: {
          fields: [
            {
              path: 'field',
              message: 'Expected string, received number',
            },
          ],
        },
      },
    });
  });

  it('should handle AppError', async () => {
    const response = await request(testApp).get('/app-error');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: 'BAD_REQUEST',
        message: 'Test error',
        details: {
          field: 'test',
        },
      },
    });
  });

  it('should handle unknown errors', async () => {
    const response = await request(testApp).get('/unknown-error');

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      error: {
        code: 'INTERNAL',
        message: 'Internal server error',
      },
    });
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(testApp).get('/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: {
        code: 'NOT_FOUND',
        message: expect.stringContaining('Route GET /unknown-route not found'),
      },
    });
  });

  it('should handle normal requests', async () => {
    const response = await request(testApp).get('/test');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      message: 'ok',
    });
  });
});
