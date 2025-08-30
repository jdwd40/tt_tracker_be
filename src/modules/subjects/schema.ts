import { z } from 'zod';

// Subject creation request schema
export const SubjectCreateReq = z.object({
  name: z.string({ required_error: 'name is required' }).min(1, 'name is required').max(60, 'name must be 60 characters or less'),
  color: z.string().optional()
});

// Subject rename request schema
export const SubjectRenameReq = z.object({
  new_name: z.string({ required_error: 'new_name is required' }).min(1, 'new_name is required').max(60, 'new_name must be 60 characters or less')
});

// Subjects join request schema
export const SubjectsJoinReq = z.object({
  source_subject_id: z.string().uuid('Invalid source subject ID'),
  target_subject_id: z.string().uuid('Invalid target subject ID'),
  delete_source: z.boolean().default(true)
});

// Subject response schema
export const Subject = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// Subject response wrapper
export const SubjectRes = z.object({
  data: Subject
});

// Subjects list response wrapper
export const SubjectsListRes = z.object({
  data: z.array(Subject)
});

// Subjects join response schema
export const SubjectsJoinRes = z.object({
  data: z.object({
    moved_count: z.number().int().min(0),
    target_subject_id: z.string().uuid()
  })
});

// Type exports
export type SubjectCreateReqType = z.infer<typeof SubjectCreateReq>;
export type SubjectRenameReqType = z.infer<typeof SubjectRenameReq>;
export type SubjectsJoinReqType = z.infer<typeof SubjectsJoinReq>;
export type SubjectType = z.infer<typeof Subject>;
export type SubjectResType = z.infer<typeof SubjectRes>;
export type SubjectsListResType = z.infer<typeof SubjectsListRes>;
export type SubjectsJoinResType = z.infer<typeof SubjectsJoinRes>;
