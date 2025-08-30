import { describe, it, expect, beforeEach } from 'vitest';
import { createTestClient } from './setup';

describe('Auth Module', () => {
  let client: ReturnType<typeof createTestClient>;

  beforeEach(() => {
    client = createTestClient();
  });

  describe('POST /auth/register', () => {
    it('should register a new user and return 201 with user_id', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await client
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      expect(response.body).toMatchObject({
        data: {
          user_id: expect.any(String)
        }
      });
    });

    it('should return 409 when registering with duplicate email', async () => {
      const registerData = {
        email: 'duplicate@example.com',
        password: 'password123'
      };

      // First registration should succeed
      await client
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      // Second registration with same email should fail
      const response = await client
        .post('/auth/register')
        .send(registerData)
        .expect(409);

      expect(response.body).toMatchObject({
        error: {
          code: 'CONFLICT',
          message: expect.stringContaining('email already exists')
        }
      });
    });

    it('should return 400 for invalid email format', async () => {
      const registerData = {
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await client
        .post('/auth/register')
        .send(registerData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('email')
        }
      });
    });

    it('should return 400 for password too short', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'short'
      };

      const response = await client
        .post('/auth/register')
        .send(registerData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('password')
        }
      });
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Register a user for login tests
      await client
        .post('/auth/register')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });
    });

    it('should login with correct credentials and return 200 with tokens', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'password123'
      };

      const response = await client
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toMatchObject({
        data: {
          access_token: expect.any(String),
          refresh_token: expect.any(String)
        }
      });

      // Verify tokens are JWT format
      expect(response.body.data.access_token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/);
      expect(response.body.data.refresh_token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/);
    });

    it('should return 401 for wrong password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'wrongpassword'
      };

      const response = await client
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toMatchObject({
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('invalid credentials')
        }
      });
    });

    it('should return 401 for non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await client
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toMatchObject({
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('invalid credentials')
        }
      });
    });

    it('should return 400 for invalid email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await client
        .post('/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('email')
        }
      });
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Register and login to get a refresh token
      await client
        .post('/auth/register')
        .send({
          email: 'refresh@example.com',
          password: 'password123'
        });

      const loginResponse = await client
        .post('/auth/login')
        .send({
          email: 'refresh@example.com',
          password: 'password123'
        });

      refreshToken = loginResponse.body.data.refresh_token;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await client
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        data: {
          access_token: expect.any(String)
        }
      });

      // Verify new access token is different and valid JWT
      expect(response.body.data.access_token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/);
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await client
        .post('/auth/refresh')
        .send({ refresh_token: 'invalid.token.here' })
        .expect(401);

      expect(response.body).toMatchObject({
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('invalid refresh token')
        }
      });
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await client
        .post('/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('refresh_token')
        }
      });
    });

    it('should return 400 for malformed request body', async () => {
      const response = await client
        .post('/auth/refresh')
        .send({ refresh_token: 123 })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('refresh_token')
        }
      });
    });
  });

  describe('POST /auth/logout', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Register and login to get a refresh token
      await client
        .post('/auth/register')
        .send({
          email: 'logout@example.com',
          password: 'password123'
        });

      const loginResponse = await client
        .post('/auth/login')
        .send({
          email: 'logout@example.com',
          password: 'password123'
        });

      refreshToken = loginResponse.body.data.refresh_token;
    });

    it('should logout successfully and return 200', async () => {
      const response = await client
        .post('/auth/logout')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        data: {
          message: expect.stringContaining('logged out')
        }
      });
    });

    it('should invalidate refresh token after logout', async () => {
      // First logout
      await client
        .post('/auth/logout')
        .send({ refresh_token: refreshToken })
        .expect(200);

      // Try to refresh with the same token - should fail
      const response = await client
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(401);

      expect(response.body).toMatchObject({
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('invalid refresh token')
        }
      });
    });

    it('should return 400 for missing refresh token in logout', async () => {
      const response = await client
        .post('/auth/logout')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('refresh_token')
        }
      });
    });

    it('should return 401 for invalid refresh token in logout', async () => {
      const response = await client
        .post('/auth/logout')
        .send({ refresh_token: 'invalid.token.here' })
        .expect(401);

      expect(response.body).toMatchObject({
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('invalid refresh token')
        }
      });
    });
  });

  describe('Error Response Format', () => {
    it('should return standardized error format for all auth errors', async () => {
      // Test with invalid email format
      const response = await client
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(typeof response.body.error.code).toBe('string');
      expect(typeof response.body.error.message).toBe('string');
      
      // Optional details property
      if (response.body.error.details) {
        expect(typeof response.body.error.details).toBe('object');
      }
    });
  });
});
