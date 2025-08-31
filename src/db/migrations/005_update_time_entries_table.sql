-- Remove subject_name column from time_entries table (it should come from subjects table via JOIN)
ALTER TABLE time_entries DROP COLUMN IF EXISTS subject_name;

-- Add unique constraint for user_id + date to enforce one entry per day per user
-- This enables the conflict detection and overwrite functionality
ALTER TABLE time_entries ADD CONSTRAINT idx_time_entries_user_date_unique UNIQUE (user_id, date);

-- Add composite index for efficient filtering by user_id and subject_id
CREATE INDEX IF NOT EXISTS idx_time_entries_user_subject_date ON time_entries(user_id, subject_id, date);
