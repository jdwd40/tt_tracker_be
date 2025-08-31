import { z } from 'zod';

// Time entry creation request schema
export const TimeEntryCreateReq = z.object({
  subject_id: z.string().uuid('Invalid subject ID').optional(),
  subject_name: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  duration_minutes: z.number().int().min(1, 'duration must be at least 1 minute').max(1440, 'duration cannot exceed 1440 minutes'),
  notes: z.string().max(500, 'notes cannot exceed 500 characters').optional(),
  overwrite_latest_overlap: z.boolean().default(false)
}).refine(
  (data) => data.subject_id || data.subject_name,
  {
    message: 'Either subject_id or subject_name is required',
    path: ['subject_id']
  }
);

// Time entry update request schema
export const TimeEntryUpdateReq = z.object({
  subject_id: z.string().uuid('Invalid subject ID').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  duration_minutes: z.number().int().min(1, 'duration must be at least 1 minute').max(1440, 'duration cannot exceed 1440 minutes').optional(),
  notes: z.string().max(500, 'notes cannot exceed 500 characters').optional()
});

// Time entry response schema
export const TimeEntry = z.object({
  id: z.string().uuid(),
  subject_id: z.string().uuid(),
  subject_name: z.string(),
  date: z.string(),
  duration_minutes: z.number().int(),
  notes: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// Time entry response wrapper
export const TimeEntryRes = z.object({
  data: TimeEntry
});

// Time entries list response wrapper
export const TimeEntriesListRes = z.object({
  data: z.array(TimeEntry)
});

// Time entry conflict response schema
export const TimeEntryConflictRes = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional()
  }),
  latest_entry: TimeEntry,
  hint: z.string()
});

// Type exports
export type TimeEntryCreateReqType = z.infer<typeof TimeEntryCreateReq>;
export type TimeEntryUpdateReqType = z.infer<typeof TimeEntryUpdateReq>;
export type TimeEntryType = z.infer<typeof TimeEntry>;
export type TimeEntryResType = z.infer<typeof TimeEntryRes>;
export type TimeEntriesListResType = z.infer<typeof TimeEntriesListRes>;
export type TimeEntryConflictResType = z.infer<typeof TimeEntryConflictRes>;
