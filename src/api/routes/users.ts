import express from 'express';
import { UserController } from '../controllers/UserController';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimmiter';

export function createUserRoutes(userController: UserController): express.Router {
  const router = express.Router();

  router.use(authenticate);

  // Get own profile
  router.get('/me',
    rateLimiter.createMiddleware(60, 60000),
    userController.getProfile.bind(userController)
  );

  // Update preferences
  router.put('/me/preferences',
    rateLimiter.createMiddleware(20, 60000),
    userController.updatePreferences.bind(userController)
  );

  // (Optional) Register a new user (for admin/dev endpoints)
  router.post('/register',
    rateLimiter.createMiddleware(5, 60000),
    userController.createUser.bind(userController)
  );

  return router;
}
