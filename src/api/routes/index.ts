import express from 'express';
import { createNotificationRoutes } from './notifications';
// import { createHealthRoutes } from './health';
import { createUserRoutes } from './users';
import { createTemplateRoutes } from './templates';

export function createRoutes(
  notificationController: any,
  userController: any,
  templateController: any
): express.Router {
  const router = express.Router();

  const v1 = express.Router();
  
  v1.use('/notifications', createNotificationRoutes(notificationController));
  v1.use('/users', createUserRoutes(userController));
  v1.use('/templates', createTemplateRoutes(templateController));
//   v1.use('/health', createHealthRoutes());

  router.use('/v1', v1);

  return router;
}
