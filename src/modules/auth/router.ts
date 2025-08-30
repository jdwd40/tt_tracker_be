import { Router } from 'express';
import { AuthController } from './controller';

const router = Router();

// POST /auth/register
router.post('/register', AuthController.register);

// POST /auth/login
router.post('/login', AuthController.login);

// POST /auth/refresh
router.post('/refresh', AuthController.refresh);

// POST /auth/logout
router.post('/logout', AuthController.logout);

export default router;
