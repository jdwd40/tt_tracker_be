import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// Error codes as defined in the backend rules
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL';

// Standard error shape
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any> | undefined;
}

// Custom error class
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, any> | undefined;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, any> | undefined
  ) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }
}

// Error normalizer
function normalizeError(error: unknown): ApiError {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const firstError = error.errors[0];
    if (firstError) {
      const message = firstError.message.toLowerCase();
      const fieldPath = firstError.path.join('.');
      
      return {
        code: 'BAD_REQUEST',
        message: message.includes('email') || fieldPath === 'email' ? 'Invalid email format' : 
                 message.includes('password') || fieldPath === 'password' ? 'password must be at least 8 characters long' :
                 message.includes('refresh_token') || fieldPath === 'refresh_token' ? 'refresh_token is required' :
                 'Validation failed',
        details: {
          fields: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        },
      };
    }
    
    return {
      code: 'BAD_REQUEST',
      message: error.errors.some(err => err.message.toLowerCase().includes('refresh_token') || err.path.join('.') === 'refresh_token') 
        ? 'refresh_token is required' 
        : 'Validation failed',
      details: {
        fields: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      },
    };
  }

  // Handle our custom AppError
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  // Handle PostgreSQL errors
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as any;

    // Handle unique constraint violations
    if (pgError.code === '23505') {
      return {
        code: 'CONFLICT',
        message: 'Resource already exists',
        details: { constraint: pgError.constraint },
      };
    }

    // Handle foreign key violations
    if (pgError.code === '23503') {
      return {
        code: 'BAD_REQUEST',
        message: 'Referenced resource does not exist',
        details: { constraint: pgError.constraint },
      };
    }
  }

  // Default internal error
  return {
    code: 'INTERNAL',
    message: 'Internal server error',
  };
}

// Error middleware
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const normalizedError = normalizeError(error);

  // Log error in development
  if (process.env['NODE_ENV'] === 'development') {
    console.error('Error:', error);
  }

  // Map error codes to HTTP status codes
  const statusCodeMap: Record<ErrorCode, number> = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL: 500,
  };

  const statusCode = statusCodeMap[normalizedError.code];

  res.status(statusCode).json({
    error: normalizedError,
  });
}

// 404 handler
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
