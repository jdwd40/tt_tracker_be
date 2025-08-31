import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './service';
import { 
  dailyReportSchema, 
  weeklyReportSchema, 
  monthlyReportSchema, 
  leaderboardSchema 
} from './schema';

const reportsService = new ReportsService();

export class ReportsController {
  async getDailyReport(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedQuery = dailyReportSchema.parse(req.query);
      const userId = req.user!.id;
      
      const data = await reportsService.getDailyReport(userId, validatedQuery);
      
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  async getWeeklyReport(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedQuery = weeklyReportSchema.parse(req.query);
      const userId = req.user!.id;
      
      const data = await reportsService.getWeeklyReport(userId, validatedQuery);
      
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyReport(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedQuery = monthlyReportSchema.parse(req.query);
      const userId = req.user!.id;
      
      const data = await reportsService.getMonthlyReport(userId, validatedQuery);
      
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  async getSubjectLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedQuery = leaderboardSchema.parse(req.query);
      const userId = req.user!.id;
      
      const data = await reportsService.getSubjectLeaderboard(userId, validatedQuery);
      
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
}
