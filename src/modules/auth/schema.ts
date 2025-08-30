import { z } from 'zod';

// Register request schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'password must be at least 8 characters long'),
});

// Login request schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Refresh request schema
export const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

// Logout request schema
export const logoutSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

// Export types
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
