import { Router } from 'express';
import { ReportsController } from './controller';
import { authenticateToken } from '../../middleware/auth';

const router = Router();
const reportsController = new ReportsController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /reports/daily
router.get('/daily', reportsController.getDailyReport.bind(reportsController));

// GET /reports/weekly
router.get('/weekly', reportsController.getWeeklyReport.bind(reportsController));

// GET /reports/monthly
router.get('/monthly', reportsController.getMonthlyReport.bind(reportsController));

// GET /reports/subject-leaderboard
router.get('/subject-leaderboard', reportsController.getSubjectLeaderboard.bind(reportsController));

export default router;
