import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { TimeEntriesController } from './controller';

const router = Router();
const timeEntriesController = new TimeEntriesController();

// All routes require authentication
router.use(authenticateToken);

// Legacy routes for auth middleware tests
router.get('/me', (req, res) => {
  res.json({
    data: {
      message: `Hello ${req.user!.email}! This is a protected route.`,
      user_id: req.user!.id,
      email: req.user!.email
    }
  });
});

router.post('/entries', (req, res) => {
  res.json({
    data: {
      message: 'Time entry created successfully',
      user_id: req.user!.id,
      entry: {
        id: 'temp-id',
        user_id: req.user!.id,
      }
    }
  });
});

// POST /time-entries - Create a time entry
router.post('/', timeEntriesController.createTimeEntry.bind(timeEntriesController));

// GET /time-entries - List time entries with filters and pagination
router.get('/', timeEntriesController.getTimeEntries.bind(timeEntriesController));

// PUT /time-entries/:id - Update a time entry
router.put('/:id', timeEntriesController.updateTimeEntry.bind(timeEntriesController));

// DELETE /time-entries/:id - Delete a time entry
router.delete('/:id', timeEntriesController.deleteTimeEntry.bind(timeEntriesController));

export { router as timeEntriesRouter };
