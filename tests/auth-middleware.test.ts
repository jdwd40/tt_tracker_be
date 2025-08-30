import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { AuthService } from '../src/modules/auth/service';

describe('Authentication Middleware', () => {
  let accessToken: string;
  let refreshToken: string;

  beforeEach(async () => {
    // Register and login a test user to get tokens
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';

    // Register user
    await request(app)
      .post('/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
      });

    // Login to get tokens
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    accessToken = loginResponse.body.data.access_token;
    refreshToken = loginResponse.body.data.refresh_token;
  });

  afterEach(async () => {
    // Clean up by logging out
    if (refreshToken) {
      try {
        await request(app)
          .post('/auth/logout')
          .send({
            refresh_token: refreshToken,
          });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Protected Routes', () => {
    it('should allow access with valid access token', async () => {
      const response = await request(app)
        .get('/time-entries/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('user_id');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data.message).toContain('This is a protected route');
    });

    it('should reject access without token', async () => {
      const response = await request(app)
        .get('/time-entries/me')
        .expect(401);

      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
      expect(response.body.error).toHaveProperty('message', 'Access token is required');
    });

    it('should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/time-entries/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature')
        .expect(401);

      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
      expect(response.body.error).toHaveProperty('message', 'Invalid access token');
    });

    it('should reject access with refresh token instead of access token', async () => {
      const response = await request(app)
        .get('/time-entries/me')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);

      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
      expect(response.body.error).toHaveProperty('message', 'Invalid access token');
    });

    it('should reject access with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/time-entries/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
      expect(response.body.error).toHaveProperty('message', 'Access token is required');
    });

    it('should reject access with empty token', async () => {
      const response = await request(app)
        .get('/time-entries/me')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
      expect(response.body.error).toHaveProperty('message', 'Access token is required');
    });
  });

  describe('Protected POST Route', () => {
    it('should allow POST access with valid access token', async () => {
      const response = await request(app)
        .post('/time-entries/entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      expect(response.body.data).toHaveProperty('message', 'Time entry created successfully');
      expect(response.body.data).toHaveProperty('user_id');
      expect(response.body.data.entry).toHaveProperty('user_id');
    });

    it('should reject POST access without token', async () => {
      const response = await request(app)
        .post('/time-entries/entries')
        .send({})
        .expect(401);

      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
      expect(response.body.error).toHaveProperty('message', 'Access token is required');
    });
  });
});
