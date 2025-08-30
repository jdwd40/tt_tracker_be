import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { SubjectsController } from './controller';

const router = Router();
const subjectsController = new SubjectsController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /subjects - List all subjects for the authenticated user
router.get('/', subjectsController.getSubjects.bind(subjectsController));

// POST /subjects - Create a new subject
router.post('/', subjectsController.createSubject.bind(subjectsController));

// PUT /subjects/:id/rename - Rename a subject
router.put('/:id/rename', subjectsController.renameSubject.bind(subjectsController));

// POST /subjects/join - Join (merge) subjects
router.post('/join', subjectsController.joinSubjects.bind(subjectsController));

export { router as subjectsRouter };
