import { pool } from '../../db';
import { TimeEntryCreateReqType, TimeEntryUpdateReqType, TimeEntryType } from './schema';

export class TimeEntriesService {
  /**
   * Get today's date in Europe/London timezone
   */
  private getTodayDate(): string {
    const now = new Date();
    // Convert to Europe/London timezone
    const londonDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    return londonDate.toISOString().split('T')[0];
  }

  /**
   * Auto-create subject if it doesn't exist
   */
  private async ensureSubjectExists(userId: string, subjectName: string): Promise<string> {
    // Check if subject exists (case-insensitive)
    const existingSubject = await pool.query(
      'SELECT id FROM subjects WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
      [userId, subjectName]
    );

    if (existingSubject.rows.length > 0) {
      return existingSubject.rows[0].id;
    }

    // Create new subject
    const result = await pool.query(
      'INSERT INTO subjects (user_id, name) VALUES ($1, $2) RETURNING id',
      [userId, subjectName]
    );

    return result.rows[0].id;
  }

  /**
   * Get the latest time entry for a user on a specific date
   */
  private async getLatestEntryOnDate(userId: string, date: string): Promise<TimeEntryType | null> {
    const result = await pool.query(
      `SELECT te.id, te.subject_id, s.name AS subject_name, te.date::text, te.duration_minutes, te.notes, te.created_at, te.updated_at
       FROM time_entries te
       LEFT JOIN subjects s ON s.id = te.subject_id
       WHERE te.user_id = $1 AND te.date = $2::date
       ORDER BY te.created_at DESC
       LIMIT 1`,
      [userId, date]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Create a time entry
   */
  async createTimeEntry(userId: string, data: TimeEntryCreateReqType): Promise<TimeEntryType> {
    const { subject_id, subject_name, date, duration_minutes, notes, overwrite_latest_overlap } = data;
    
    // Determine the date to use
    const entryDate = date || this.getTodayDate();
    
    // Determine the subject ID
    let finalSubjectId: string;
    if (subject_id) {
      // Verify subject exists and belongs to user
      const subjectCheck = await pool.query(
        'SELECT id FROM subjects WHERE id = $1 AND user_id = $2',
        [subject_id, userId]
      );
      
      if (subjectCheck.rows.length === 0) {
        throw { httpStatus: 404, code: 'NOT_FOUND', message: 'Subject not found' };
      }
      
      finalSubjectId = subject_id;
    } else if (subject_name) {
      finalSubjectId = await this.ensureSubjectExists(userId, subject_name);
    } else {
      throw {
        httpStatus: 400,
        code: 'BAD_REQUEST',
        message: 'Either subject_id or subject_name is required'
      };
    }

    if (overwrite_latest_overlap) {
      // Find and update the latest entry for that date
      const existingEntry = await this.getLatestEntryOnDate(userId, entryDate);
      
      if (existingEntry) {
        // Update the existing entry
        const result = await pool.query(
          `UPDATE time_entries 
           SET subject_id = $1, duration_minutes = $2, notes = $3, updated_at = NOW()
           WHERE id = $4
           RETURNING id, subject_id, date, duration_minutes, notes, created_at, updated_at`,
          [finalSubjectId, duration_minutes, notes || null, existingEntry.id]
        );

        // Get the updated entry with subject name
        const updatedEntry = await this.getTimeEntryById(userId, existingEntry.id);
        if (!updatedEntry) {
          throw {
            httpStatus: 500,
            code: 'INTERNAL',
            message: 'Failed to retrieve updated time entry'
          };
        }

        return updatedEntry;
      }
    }

    try {
      // Try to insert new entry
      const result = await pool.query(
        `INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
         VALUES ($1, $2, $3::date, $4, $5)
         RETURNING id, user_id, subject_id, date, duration_minutes, notes, created_at, updated_at`,
        [userId, finalSubjectId, entryDate, duration_minutes, notes || null]
      );

      // Get the created entry with subject name
      const createdEntry = await this.getTimeEntryById(userId, result.rows[0].id);
      if (!createdEntry) {
        throw {
          httpStatus: 500,
          code: 'INTERNAL',
          message: 'Failed to retrieve created time entry'
        };
      }

      return createdEntry;
    } catch (error: any) {
      // Handle database constraint violation
      if (error.code === '23505') {
        // Check if it's the time entries unique constraint (either by name or by checking the table)
        if (error.constraint === 'idx_time_entries_user_date_unique' || 
            (error.table === 'time_entries' && error.detail && error.detail.includes('user_id'))) {
          // Get the latest entry for that user_id + date
          const latestEntry = await pool.query(
            `SELECT te.id, te.subject_id, s.name AS subject_name, te.date::text, te.duration_minutes, te.notes, te.created_at, te.updated_at
             FROM time_entries te
             JOIN subjects s ON s.id = te.subject_id
             WHERE te.user_id = $1 AND te.date = $2::date
             ORDER BY te.created_at DESC
             LIMIT 1`,
            [userId, entryDate]
          );

          if (latestEntry.rows.length === 0) {
            throw {
              httpStatus: 500,
              code: 'INTERNAL',
              message: 'Failed to retrieve conflicting time entry'
            };
          }

                  throw {
          httpStatus: 409,
          code: 'CONFLICT',
          message: 'Latest entry exists on this date',
          details: {
            latest_entry: latestEntry.rows[0],
            hint: 'Retry with overwrite_latest_overlap=true to replace the latest entry on this date.',
          },
        };
        }
      }
      throw error;
    }
  }

  /**
   * Get time entries with filters and pagination
   */
  async getTimeEntries(
    userId: string,
    filters: {
      start?: string;
      end?: string;
      subject_id?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ entries: TimeEntryType[]; total: number }> {
    const { start, end, subject_id, page = 1, limit = 50 } = filters;
    
    // Build WHERE clause
    const whereConditions = ['te.user_id = $1'];
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    if (start) {
      whereConditions.push(`te.date >= $${paramIndex}`);
      queryParams.push(start);
      paramIndex++;
    }

    if (end) {
      whereConditions.push(`te.date <= $${paramIndex}`);
      queryParams.push(end);
      paramIndex++;
    }

    if (subject_id) {
      whereConditions.push(`te.subject_id = $${paramIndex}`);
      queryParams.push(subject_id);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM time_entries te
       WHERE ${whereClause}`,
      queryParams
    );

    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const offset = (page - 1) * limit;
    const entriesResult = await pool.query(
      `SELECT te.id, te.subject_id, s.name as subject_name, te.date::text, te.duration_minutes, te.notes, te.created_at, te.updated_at
       FROM time_entries te
       LEFT JOIN subjects s ON te.subject_id = s.id
       WHERE ${whereClause}
       ORDER BY te.date ASC, te.created_at ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    return {
      entries: entriesResult.rows,
      total
    };
  }

  /**
   * Get a single time entry by ID
   */
  async getTimeEntryById(userId: string, entryId: string): Promise<TimeEntryType | null> {
    const result = await pool.query(
      `SELECT te.id, te.subject_id, s.name as subject_name, te.date::text, te.duration_minutes, te.notes, te.created_at, te.updated_at
       FROM time_entries te
       LEFT JOIN subjects s ON te.subject_id = s.id
       WHERE te.id = $1 AND te.user_id = $2`,
      [entryId, userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Update a time entry
   */
  async updateTimeEntry(userId: string, entryId: string, data: TimeEntryUpdateReqType): Promise<TimeEntryType> {
    // Check if entry exists and belongs to user
    const existingEntry = await this.getTimeEntryById(userId, entryId);
    if (!existingEntry) {
      throw {
        httpStatus: 404,
        code: 'NOT_FOUND',
        message: 'time entry not found'
      };
    }

    const { subject_id, date, duration_minutes, notes } = data;
    const updates: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Build update query dynamically
    if (subject_id !== undefined) {
      // Verify subject exists and belongs to user
      const subjectCheck = await pool.query(
        'SELECT id FROM subjects WHERE id = $1 AND user_id = $2',
        [subject_id, userId]
      );
      
      if (subjectCheck.rows.length === 0) {
        throw { httpStatus: 404, code: 'NOT_FOUND', message: 'Subject not found' };
      }

      updates.push(`subject_id = $${paramIndex}`);
      queryParams.push(subject_id);
      paramIndex++;
    }

    if (date !== undefined) {
      updates.push(`date = $${paramIndex}`);
      queryParams.push(date);
      paramIndex++;
    }

    if (duration_minutes !== undefined) {
      updates.push(`duration_minutes = $${paramIndex}`);
      queryParams.push(duration_minutes);
      paramIndex++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      queryParams.push(notes);
      paramIndex++;
    }

    if (updates.length === 0) {
      // No updates to make, return existing entry
      return existingEntry;
    }

    // Add updated_at and entry ID
    updates.push(`updated_at = NOW()`);
    queryParams.push(entryId);

    const result = await pool.query(
      `UPDATE time_entries 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING id, subject_id, date, duration_minutes, notes, created_at, updated_at`,
      [...queryParams, userId]
    );

    if (result.rows.length === 0) {
      throw {
        httpStatus: 404,
        code: 'NOT_FOUND',
        message: 'Time entry not found'
      };
    }

    // Get the updated entry with subject name
    const updatedEntry = await this.getTimeEntryById(userId, entryId);
    if (!updatedEntry) {
      throw {
        httpStatus: 500,
        code: 'INTERNAL',
        message: 'Failed to retrieve updated time entry'
      };
    }

    return updatedEntry;
  }

  /**
   * Delete a time entry
   */
  async deleteTimeEntry(userId: string, entryId: string): Promise<void> {
    const result = await pool.query(
      'DELETE FROM time_entries WHERE id = $1 AND user_id = $2',
      [entryId, userId]
    );

    if (result.rowCount === 0) {
      throw {
        httpStatus: 404,
        code: 'NOT_FOUND',
        message: 'time entry not found'
      };
    }
  }
}
