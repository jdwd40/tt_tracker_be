import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

type AppErrorLike = {
  httpStatus?: number;
  statusCode?: number;
  status?: number;
  code?: string;
  message?: string;
  details?: Record<string, any>;
};

const getStatus = (err: AppErrorLike) =>
  typeof err.httpStatus === 'number' ? err.httpStatus
  : typeof err.statusCode === 'number' ? err.statusCode
  : typeof err.status === 'number' ? err.status
  : undefined;

const isAppError = (err: any): err is AppErrorLike =>
  !!err && typeof getStatus(err) === 'number' && typeof err.code === 'string' && typeof err.message === 'string';

export function errorMiddleware(err: any, _req: Request, res: Response, _next: NextFunction) {
  // 1) Zod → 400 (standardized)
  if (err instanceof ZodError) {
    const fields = err.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    
    // Create a more descriptive message that includes field names
    const fieldNames = fields.map(f => f.path).join(', ');
    const message = fieldNames ? `Validation failed for fields: ${fieldNames}` : 'Validation failed';
    
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message,
        details: { fields },
      },
    });
  }

  // 2) PG unique violation (safety net for time_entries user+date)
  if (err?.code === '23505' && err?.constraint === 'idx_time_entries_user_date_unique') {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'Latest entry exists on this date' },
    });
  }

  // 3) AppError (duck-typed, not instanceof)
  if (isAppError(err)) {
    const status = getStatus(err)!;
    const { code, message, details } = err;
    const body: any = { error: { code, message } };
    if (details) {
      if (details.latest_entry) body.latest_entry = details.latest_entry;
      if (details.hint) body.hint = details.hint;
      const { latest_entry, hint, ...rest } = details;
      if (Object.keys(rest).length) body.error.details = rest;
    }
    return res.status(status).json(body);
  }

  // 4) Unknown → 500
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', { name: err?.name, code: err?.code, message: err?.message });
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
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
