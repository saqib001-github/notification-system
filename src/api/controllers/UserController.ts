import { Request, Response } from 'express';
import { UserRepository } from '../../repositories/UserRepository';
import { Logger } from '../../utils/Logger';
import Joi from 'joi';

type AuthenticatedRequest = Request & { user?: { id: string, email: string } };

export class UserController {
  private userRepo: UserRepository;
  private logger: Logger;

  constructor() {
    this.userRepo = new UserRepository();
    this.logger = Logger.getInstance();
  }

  // Get user profile (self)
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const user = await this.userRepo.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      res.json({ success: true, data: user });
    } catch (error) {
      this.logger.error('Failed to get user profile', error as Error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  }

  // Update notification preferences
  async updatePreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = Joi.object({ preferences: Joi.object().required() })
        .validate(req.body);
      if (error) {
        res.status(400).json({ success: false, error: error.details[0].message });
        return;
      }
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      await this.userRepo.updatePreferences(userId, value.preferences);
      res.json({ success: true, message: 'Preferences updated' });
    } catch (err) {
      this.logger.error('Failed to update preferences', err as Error);
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  // Optional: create/register user (admin/dev use)
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        phoneNumber: Joi.string().optional()
      });
      const { error, value } = schema.validate(req.body);
      if (error) {
        res.status(400).json({ success: false, error: error.details[0].message });
        return;
      }
      const repo = new UserRepository();
      // hash password, insert user logic (implement in repo or a service - not shown here)
      // ...

      res.status(201).json({ success: true, message: 'User created' });
    } catch (err) {
      this.logger.error('Failed to create user', err as Error);
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }
}
