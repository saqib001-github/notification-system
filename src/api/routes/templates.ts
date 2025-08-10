import express from 'express';
import { TemplateController } from '../controllers/TemplateController';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimmiter';

export function createTemplateRoutes(templateController: TemplateController): express.Router {
  const router = express.Router();

  router.use(authenticate);

  // List all active templates
  router.get('/',
    rateLimiter.createMiddleware(60, 60000),
    templateController.listTemplates.bind(templateController)
  );

  // Get a single template by name
  router.get('/:name',
    rateLimiter.createMiddleware(30, 60000),
    templateController.getTemplate.bind(templateController)
  );

  // Create a new template (admin/dev)
  router.post('/',
    rateLimiter.createMiddleware(10, 60000),
    templateController.createTemplate.bind(templateController)
  );

  // Update template (admin/dev)
  router.put('/:name',
    rateLimiter.createMiddleware(10, 60000),
    templateController.updateTemplate.bind(templateController)
  );

  return router;
}
