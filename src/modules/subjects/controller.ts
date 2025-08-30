import { Request, Response, NextFunction } from 'express';
import { SubjectsService } from './service';
import { 
  SubjectCreateReq, 
  SubjectRenameReq, 
  SubjectsJoinReq 
} from './schema';
import { AppError } from '../../middleware/error';

export class SubjectsController {
  private subjectsService: SubjectsService;

  constructor() {
    this.subjectsService = new SubjectsService();
  }

  /**
   * GET /subjects - List all subjects for the authenticated user
   */
  async getSubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const subjects = await this.subjectsService.getSubjects(userId);
      
      res.status(200).json({
        data: subjects
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /subjects - Create a new subject
   */
  async createSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const validationResult = SubjectCreateReq.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => err.message).join(', ');
        throw new AppError('BAD_REQUEST', errors);
      }

      const userId = req.user!.id;
      const subjectData = validationResult.data;
      
      const subject = await this.subjectsService.createSubject(userId, subjectData);
      
      res.status(201).json({
        data: subject
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /subjects/:id/rename - Rename a subject
   */
  async renameSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new AppError('BAD_REQUEST', 'Subject ID is required');
      }
      const userId = req.user!.id;

      // Validate request body
      const validationResult = SubjectRenameReq.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => err.message).join(', ');
        throw new AppError('BAD_REQUEST', errors);
      }

      const renameData = validationResult.data;
      const subject = await this.subjectsService.renameSubject(userId, id, renameData);
      
      res.status(200).json({
        data: subject
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /subjects/join - Join (merge) subjects
   */
  async joinSubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const validationResult = SubjectsJoinReq.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => err.message).join(', ');
        throw new AppError('BAD_REQUEST', errors);
      }

      const userId = req.user!.id;
      const joinData = validationResult.data;
      
      const result = await this.subjectsService.joinSubjects(userId, joinData);
      
      res.status(200).json({
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
