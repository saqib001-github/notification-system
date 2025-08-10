import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../../repositories/UserRepository';
import { config } from '../../config/environment';
import { Logger } from '../../utils/Logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

const userRepo = new UserRepository();
const logger = Logger.getInstance();

export async function authenticate(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided'
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    const user = await userRepo.findById(decoded.userId);
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Invalid or inactive user'
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email
    };

    next();

  } catch (error) {
    logger.warn('Authentication failed', { error: (error as Error).message });
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
}

// Optional authentication - doesn't fail if no token
export async function optionalAuth(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      
      const user = await userRepo.findById(decoded.userId);
      if (user && user.isActive) {
        req.user = {
          id: user.id,
          email: user.email
        };
      }
    }

    next();

  } catch (error) {
    // To-do: Continue without authentication (bypass for now)
    next();
  }
}
