import { Request, Response, NextFunction } from 'express';
import { TimeEntriesService } from './service';
import { TimeEntryCreateReq, TimeEntryUpdateReq } from './schema';

export class TimeEntriesController {
  private timeEntriesService: TimeEntriesService;

  constructor() {
    this.timeEntriesService = new TimeEntriesService();
  }

  /**
   * POST /time-entries - Create a time entry
   */
  async createTimeEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const validationResult = TimeEntryCreateReq.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => err.message).join(', ');
        throw {
          httpStatus: 400,
          code: 'BAD_REQUEST',
          message: errors
        };
      }

      const userId = req.user!.id;
      const timeEntryData = validationResult.data;
      
      const timeEntry = await this.timeEntriesService.createTimeEntry(userId, timeEntryData);
      
      res.status(201).json({
        data: timeEntry
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /time-entries - List time entries with filters and pagination
   */
  async getTimeEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      
      // Parse query parameters
      const start = req.query.start as string | undefined;
      const end = req.query.end as string | undefined;
      const subject_id = req.query.subject_id as string | undefined;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      // Validate pagination parameters
      if (page < 1) {
        throw {
          httpStatus: 400,
          code: 'BAD_REQUEST',
          message: 'Page must be at least 1'
        };
      }
      if (limit < 1 || limit > 200) {
        throw {
          httpStatus: 400,
          code: 'BAD_REQUEST',
          message: 'Limit must be between 1 and 200'
        };
      }

      const { entries, total } = await this.timeEntriesService.getTimeEntries(userId, {
        start,
        end,
        subject_id,
        page,
        limit
      });

      // Set X-Total-Count header
      res.set('X-Total-Count', total.toString());
      
      res.status(200).json({
        data: entries
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /time-entries/:id - Update a time entry
   */
  async updateTimeEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw {
          httpStatus: 400,
          code: 'BAD_REQUEST',
          message: 'Time entry ID is required'
        };
      }

      // Validate request body
      const validationResult = TimeEntryUpdateReq.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => err.message).join(', ');
        throw {
          httpStatus: 400,
          code: 'BAD_REQUEST',
          message: errors
        };
      }

      const userId = req.user!.id;
      const updateData = validationResult.data;
      
      const timeEntry = await this.timeEntriesService.updateTimeEntry(userId, id, updateData);
      
      res.status(200).json({
        data: timeEntry
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /time-entries/:id - Delete a time entry
   */
  async deleteTimeEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw {
          httpStatus: 400,
          code: 'BAD_REQUEST',
          message: 'Time entry ID is required'
        };
      }

      const userId = req.user!.id;
      
      await this.timeEntriesService.deleteTimeEntry(userId, id);
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
