import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment schema
const envSchema = z.object({
  POSTGRES_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

// Validate and export environment variables
export const env = envSchema.parse(process.env);

// Type for environment variables
export type Env = z.infer<typeof envSchema>;
