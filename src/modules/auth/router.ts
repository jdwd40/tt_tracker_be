import { Router } from 'express';
import { AuthController } from './controller';
import { authRateLimit } from '../../middleware/rateLimit';

const router = Router();

// Apply rate limiting only in production
const rateLimitMiddleware = process.env.NODE_ENV === 'production' ? authRateLimit : (req: any, res: any, next: any) => next();

// POST /auth/register - Rate limited to prevent abuse
router.post('/register', rateLimitMiddleware, AuthController.register);

// POST /auth/login - Rate limited to prevent brute force
router.post('/login', rateLimitMiddleware, AuthController.login);

// POST /auth/refresh - Rate limited to prevent abuse
router.post('/refresh', rateLimitMiddleware, AuthController.refresh);

// POST /auth/logout - Rate limited to prevent abuse
router.post('/logout', rateLimitMiddleware, AuthController.logout);

export default router;
