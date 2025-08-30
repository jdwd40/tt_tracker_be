import { pool } from '../../db';
import { AppError } from '../../middleware/error';
import { 
  SubjectType, 
  SubjectCreateReqType, 
  SubjectRenameReqType, 
  SubjectsJoinReqType 
} from './schema';

export class SubjectsService {
  /**
   * Get all subjects for a user, sorted by name (case-insensitive)
   */
  async getSubjects(userId: string): Promise<SubjectType[]> {
    const query = `
      SELECT id, name, color, created_at, updated_at
      FROM subjects 
      WHERE user_id = $1 
      ORDER BY LOWER(name) ASC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Create a new subject
   */
  async createSubject(userId: string, data: SubjectCreateReqType): Promise<SubjectType> {
    const { name, color } = data;
    
    const query = `
      INSERT INTO subjects (user_id, name, color)
      VALUES ($1, $2, $3)
      RETURNING id, name, color, created_at, updated_at
    `;
    
    try {
      const result = await pool.query(query, [userId, name, color]);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505' && error.constraint === 'idx_subjects_user_name_unique') {
        throw new AppError('CONFLICT', 'subject name already exists');
      }
      throw error;
    }
  }

  /**
   * Get a subject by ID, ensuring it belongs to the user
   */
  async getSubjectById(userId: string, subjectId: string): Promise<SubjectType> {
    const query = `
      SELECT id, name, color, created_at, updated_at
      FROM subjects 
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await pool.query(query, [subjectId, userId]);
    
    if (result.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'subject not found');
    }
    
    return result.rows[0];
  }

  /**
   * Rename a subject
   */
  async renameSubject(userId: string, subjectId: string, data: SubjectRenameReqType): Promise<SubjectType> {
    const { new_name } = data;
    
    // First check if the subject exists and belongs to the user
    await this.getSubjectById(userId, subjectId);
    
    const query = `
      UPDATE subjects 
      SET name = $1
      WHERE id = $2 AND user_id = $3
      RETURNING id, name, color, created_at, updated_at
    `;
    
    try {
      const result = await pool.query(query, [new_name, subjectId, userId]);
      
      if (result.rows.length === 0) {
        throw new AppError('NOT_FOUND', 'subject not found');
      }
      
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505' && error.constraint === 'idx_subjects_user_name_unique') {
        throw new AppError('CONFLICT', 'subject name already exists');
      }
      throw error;
    }
  }

  /**
   * Join (merge) subjects by moving time entries and optionally deleting source
   */
  async joinSubjects(userId: string, data: SubjectsJoinReqType): Promise<{ moved_count: number; target_subject_id: string }> {
    const { source_subject_id, target_subject_id, delete_source } = data;
    
    // Validate that source and target are different
    if (source_subject_id === target_subject_id) {
      throw new AppError('BAD_REQUEST', 'source and target cannot be the same');
    }
    
    // Validate that both subjects exist and belong to the user
    try {
      await this.getSubjectById(userId, source_subject_id);
    } catch (error) {
      if (error instanceof AppError && error.code === 'NOT_FOUND') {
        throw new AppError('NOT_FOUND', 'source subject not found');
      }
      throw error;
    }
    
    try {
      await this.getSubjectById(userId, target_subject_id);
    } catch (error) {
      if (error instanceof AppError && error.code === 'NOT_FOUND') {
        throw new AppError('NOT_FOUND', 'target subject not found');
      }
      throw error;
    }
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Move all time entries from source to target
      const moveQuery = `
        UPDATE time_entries 
        SET subject_id = $1
        WHERE subject_id = $2 AND user_id = $3
      `;
      
      const moveResult = await client.query(moveQuery, [
        target_subject_id, 
        source_subject_id, 
        userId
      ]);
      
      const movedCount = moveResult.rowCount || 0;
      
      // Delete source subject if requested
      if (delete_source) {
        const deleteQuery = `
          DELETE FROM subjects 
          WHERE id = $1 AND user_id = $2
        `;
        
        await client.query(deleteQuery, [source_subject_id, userId]);
      }
      
      await client.query('COMMIT');
      
      return {
        moved_count: movedCount,
        target_subject_id: target_subject_id
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
