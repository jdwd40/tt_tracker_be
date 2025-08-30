import { Request, Response, NextFunction } from 'express';
import { AuthService } from './service';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  type RegisterInput,
  type LoginInput,
  type RefreshInput,
  type LogoutInput,
} from './schema';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = registerSchema.parse(req.body) as RegisterInput;
      const result = await AuthService.register(input);
      
      res.status(201).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = loginSchema.parse(req.body) as LoginInput;
      const result = await AuthService.login(input);
      
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = refreshSchema.parse(req.body) as RefreshInput;
      const result = await AuthService.refresh(input);
      
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = logoutSchema.parse(req.body) as LogoutInput;
      const result = await AuthService.logout(input);
      
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
