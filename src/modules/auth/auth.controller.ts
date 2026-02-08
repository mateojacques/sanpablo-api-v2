import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import type { AuthenticatedRequest } from '../../shared/types/index.js';
import type {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from './auth.schemas.js';

export const authController = {
  /**
   * POST /api/auth/register
   * Register a new user
   */
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = req.body as RegisterInput;
      const result = await authService.register(input);

      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/login
   * Authenticate user
   */
  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = req.body as LoginInput;
      const result = await authService.login(input);

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/me
   * Get current user profile
   */
  getProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const profile = await authService.getProfile(user.id);

      res.json({ data: profile });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/auth/me
   * Update current user profile
   */
  updateProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const input = req.body as UpdateProfileInput;
      const profile = await authService.updateProfile(user.id, input);

      res.json({ data: profile });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/auth/password
   * Change current user password
   */
  changePassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const input = req.body as ChangePasswordInput;
      await authService.changePassword(user.id, input);

      res.json({ data: { message: 'Password changed successfully' } });
    } catch (error) {
      next(error);
    }
  },
};
