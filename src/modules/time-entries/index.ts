import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { pool } from '../../db';

const router = Router();

// Protected route - requires authentication
router.get('/me', authenticateToken, (req, res) => {
  // req.user is now available thanks to the authenticateToken middleware
  res.json({
    data: {
      message: `Hello ${req.user!.email}! This is a protected route.`,
      user_id: req.user!.id,
      email: req.user!.email
    }
  });
});

// Create time entry endpoint for testing subjects join functionality
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { subject_id, date, duration_minutes, notes } = req.body;
    const userId = req.user!.id;

    // Validate required fields
    if (!subject_id || !date || !duration_minutes) {
      throw new AppError('BAD_REQUEST', 'subject_id, date, and duration_minutes are required');
    }

    // Verify subject exists
    const subjectQuery = await pool.query(
      'SELECT id FROM subjects WHERE id = $1 AND user_id = $2',
      [subject_id, userId]
    );

    if (subjectQuery.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Subject not found');
    }

    // Insert time entry
    const result = await pool.query(
      `INSERT INTO time_entries (user_id, subject_id, date, duration_minutes, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, subject_id, date, duration_minutes, notes, created_at, updated_at`,
      [userId, subject_id, date, duration_minutes, notes || null]
    );

    // Get the subject name for the response
    const subjectNameResult = await pool.query(
      'SELECT name FROM subjects WHERE id = $1',
      [subject_id]
    );
    
    const subjectName = subjectNameResult.rows[0]?.name || null;
    
    // Return the time entry with subject name
    const timeEntryWithSubjectName = {
      ...result.rows[0],
      subject_name: subjectName
    };

    res.status(201).json({
      data: timeEntryWithSubjectName
    });
  } catch (error) {
    throw error;
  }
});

// Get time entries endpoint for testing
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const result = await pool.query(
      `SELECT te.id, te.subject_id, s.name as subject_name, te.date, te.duration_minutes, te.notes, te.created_at, te.updated_at 
       FROM time_entries te 
       LEFT JOIN subjects s ON te.subject_id = s.id 
       WHERE te.user_id = $1 
       ORDER BY te.date DESC`,
      [userId]
    );

    res.status(200).json({
      data: result.rows
    });
  } catch (error) {
    throw error;
  }
});

// Another protected route example
router.post('/entries', authenticateToken, (req, res) => {
  // This would create a time entry for the authenticated user
  res.json({
    data: {
      message: 'Time entry created successfully',
      user_id: req.user!.id,
      entry: {
        id: 'temp-id',
        user_id: req.user!.id,
        // ... other entry data
      }
    }
  });
});

export { router as timeEntriesRouter };
