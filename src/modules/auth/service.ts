import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../../db';
import { env } from '../../config/env';
import { AppError } from '../../middleware/error';
import { tokenStore } from './tokenStore';
import type {
  User,
  AccessTokenPayload,
  RefreshTokenPayload,
} from './types';
import type {
  RegisterInput,
  LoginInput,
  RefreshInput,
  LogoutInput,
} from './schema';

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';

  /**
   * Register a new user
   */
  static async register(input: RegisterInput): Promise<{ user_id: string }> {
    const { email, password } = input;

    // Check if user already exists
    const existingUser = await query<User>(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError(
        'CONFLICT',
        'User with this email already exists'
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Insert new user
    const result = await query<User>(
      `INSERT INTO users (email, password_hash, timezone)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [email.toLowerCase(), passwordHash, 'Europe/London']
    );

    if (result.rows.length === 0) {
      throw new AppError('INTERNAL', 'Failed to create user');
    }

    const user = result.rows[0];
    if (!user) {
      throw new AppError('INTERNAL', 'Failed to create user');
    }

    return { user_id: user.id };
  }

  /**
   * Login user and return tokens
   */
  static async login(input: LoginInput): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const { email, password } = input;

    // Find user by email (case-insensitive)
    const result = await query<User>(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (result.rows.length === 0) {
      throw new AppError(
        'UNAUTHORIZED',
        'invalid credentials'
      );
    }

    const user = result.rows[0];
    if (!user) {
      throw new AppError(
        'UNAUTHORIZED',
        'invalid credentials'
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError(
        'UNAUTHORIZED',
        'invalid credentials'
      );
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Add refresh token to store
    tokenStore.addToken(refreshToken);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refresh(input: RefreshInput): Promise<{ access_token: string }> {
    const { refresh_token } = input;

    try {
      // Verify refresh token
      const payload = jwt.verify(refresh_token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;

      // Check if token exists in store
      if (!tokenStore.hasToken(refresh_token)) {
        throw new AppError(
          'UNAUTHORIZED',
          'invalid refresh token'
        );
      }

      // Get user to generate new access token
      const userResult = await query<User>(
        'SELECT * FROM users WHERE id = $1',
        [payload.user_id]
      );

      if (userResult.rows.length === 0) {
        throw new AppError(
          'UNAUTHORIZED',
          'invalid refresh token'
        );
      }

      const user = userResult.rows[0];
      if (!user) {
        throw new AppError(
          'UNAUTHORIZED',
          'invalid refresh token'
        );
      }
      const accessToken = this.generateAccessToken(user);

      return { access_token: accessToken };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'UNAUTHORIZED',
        'invalid refresh token'
      );
    }
  }

  /**
   * Logout user by removing refresh token from store
   */
  static async logout(input: LogoutInput): Promise<{ message: string }> {
    const { refresh_token } = input;

    try {
      // Verify refresh token to get user info
      const payload = jwt.verify(refresh_token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;

      // Remove token from store
      tokenStore.removeToken(refresh_token);

      return { message: 'Successfully logged out' };
    } catch (error) {
      // For invalid tokens, return 401 error
      throw new AppError(
        'UNAUTHORIZED',
        'invalid refresh token'
      );
    }
  }

  /**
   * Generate access token
   */
  private static generateAccessToken(user: User): string {
    const payload: AccessTokenPayload = {
      user_id: user.id,
      email: user.email,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate refresh token
   */
  private static generateRefreshToken(user: User): string {
    const payload: RefreshTokenPayload = {
      user_id: user.id,
      email: user.email,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });
  }
}
