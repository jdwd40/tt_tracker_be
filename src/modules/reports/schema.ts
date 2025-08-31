import { z } from 'zod';

// Base schema for date range validation
const dateRangeSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
}).refine((data) => {
  const startDate = new Date(data.start);
  const endDate = new Date(data.end);
  return endDate >= startDate;
}, {
  message: 'End date must be greater than or equal to start date',
  path: ['end'],
});

// Daily reports schema
export const dailyReportSchema = dateRangeSchema;

// Weekly reports schema
export const weeklyReportSchema = dateRangeSchema;

// Monthly reports schema
export const monthlyReportSchema = dateRangeSchema;

// Subject leaderboard schema
export const leaderboardSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
}).refine((data) => {
  const startDate = new Date(data.start);
  const endDate = new Date(data.end);
  return endDate >= startDate;
}, {
  message: 'End date must be greater than or equal to start date',
  path: ['end'],
});

export type DailyReportQuery = z.infer<typeof dailyReportSchema>;
export type WeeklyReportQuery = z.infer<typeof weeklyReportSchema>;
export type MonthlyReportQuery = z.infer<typeof monthlyReportSchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardSchema>;
