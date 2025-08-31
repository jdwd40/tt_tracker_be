import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { AccessTokenPayload, User } from '../modules/auth/types';
import { query } from '../db';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Authentication middleware that verifies JWT access tokens
 * and adds user information to the request object
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw {
        httpStatus: 401,
        code: 'UNAUTHORIZED',
        message: 'Access token is required'
      };
    }

    // Verify the token
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

    // Validate token type
    if (payload.type !== 'access') {
      throw {
        httpStatus: 401,
        code: 'UNAUTHORIZED',
        message: 'Invalid token type'
      };
    }

    // Get user from database to ensure they still exist
    const userResult = await query<User>(
      'SELECT * FROM users WHERE id = $1',
      [payload.user_id]
    );

    if (userResult.rows.length === 0) {
      throw {
        httpStatus: 401,
        code: 'UNAUTHORIZED',
        message: 'User not found'
      };
    }

    const user = userResult.rows[0];
    if (!user) {
      throw {
        httpStatus: 401,
        code: 'UNAUTHORIZED',
        message: 'User not found'
      };
    }

    // Add user to request object
    req.user = user;

    next();
  } catch (error) {
    // Use duck-typing for AppError check
    if (error && typeof error === 'object' && 'httpStatus' in error && 'code' in error) {
      next(error);
    } else if (error instanceof jwt.JsonWebTokenError) {
      // Check if it's a malformed token (like empty or invalid format)
      if (error.message.includes('jwt malformed') || error.message.includes('jwt must be provided')) {
        next({
          httpStatus: 401,
          code: 'UNAUTHORIZED',
          message: 'Access token is required'
        });
      } else {
        next({
          httpStatus: 401,
          code: 'UNAUTHORIZED',
          message: 'Invalid access token'
        });
      }
    } else if (error instanceof jwt.TokenExpiredError) {
      next({
        httpStatus: 401,
        code: 'UNAUTHORIZED',
        message: 'Access token has expired'
      });
    } else if (error instanceof SyntaxError) {
      // Handle malformed JWT tokens that cause JSON parsing errors
      next({
        httpStatus: 401,
        code: 'UNAUTHORIZED',
        message: 'Invalid access token'
      });
    } else {
      next({
        httpStatus: 500,
        code: 'INTERNAL',
        message: 'Authentication failed'
      });
    }
  }
};

/**
 * Optional authentication middleware that doesn't fail if no token is provided
 * Useful for routes that can work with or without authentication
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    // Try to verify the token
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

    if (payload.type !== 'access') {
      // Invalid token type, continue without authentication
      next();
      return;
    }

    // Get user from database
    const userResult = await query<User>(
      'SELECT * FROM users WHERE id = $1',
      [payload.user_id]
    );

    if (userResult.rows.length > 0) {
      req.user = userResult.rows[0];
    }

    next();
  } catch (error) {
    // Any error with token verification, continue without authentication
    next();
  }
};

/**
 * Role-based authorization middleware
 * Checks if the authenticated user has the required role
 */
export const requireRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next({
        httpStatus: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
      return;
    }

    // Check if user has the required role
    if (req.user.role !== requiredRole) {
      next({
        httpStatus: 403,
        code: 'FORBIDDEN',
        message: `Role '${requiredRole}' is required`
      });
      return;
    }

    next();
  };
};

/**
 * Check if user has any of the specified roles
 */
export const requireAnyRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(
        'UNAUTHORIZED',
        'Authentication required'
      ));
      return;
    }

    // Check if user has any of the required roles
    if (!roles.includes(req.user.role)) {
      next(new AppError(
        'FORBIDDEN',
        'Insufficient permissions'
      ));
      return;
    }

    next();
  };
};
