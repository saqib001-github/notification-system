import { Request, Response } from 'express';
import { TemplateRepository } from '../../repositories/TemplateRepository';
import { Logger } from '../../utils/Logger';
import Joi from 'joi';

export class TemplateController {
  private templateRepo: TemplateRepository;
  private logger: Logger;

  constructor() {
    this.templateRepo = new TemplateRepository();
    this.logger = Logger.getInstance();
  }

  async listTemplates(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.templateRepo.findActive();
      res.json({ success: true, data: result });
    } catch (err) {
      this.logger.error('Failed to list templates', err as Error);
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const tmpl = await this.templateRepo.findByName(name);
      if (!tmpl) {
        res.status(404).json({ success: false, error: 'Template not found' });
        return;
      }
      res.json({ success: true, data: tmpl });
    } catch (err) {
      this.logger.error('Failed to get template', err as Error);
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  async createTemplate(req: Request, res: Response): Promise<void> {
    // Implement create logic using TemplateRepository.create (not shown here)
    // Use Joi for validation
    res.status(201).json({ success: true, message: 'Template created (logic to be implemented)' });
  }

  async updateTemplate(req: Request, res: Response): Promise<void> {
    // Implement update logic using TemplateRepository.update (not shown here)
    res.json({ success: true, message: 'Template updated (logic to be implemented)' });
  }
}
