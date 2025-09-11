// [advice from AI] 인증 미들웨어

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { PermissionLevel } from '../types/auth';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

// [advice from AI] JWT 토큰 검증 미들웨어
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header missing' });
      return;
    }

    const token = authHeader.substring(7);
    const user = await AuthService.verifyToken(token);
    
    req.user = user;
    next();
    return;
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
};

// [advice from AI] 권한 레벨 확인 미들웨어
export const requirePermission = (minPermissionLevel: PermissionLevel) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.permissionLevel > minPermissionLevel) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
    return;
  };
};

// [advice from AI] Administrator 전용 미들웨어
export const requireAdministrator = requirePermission(PermissionLevel.ADMINISTRATOR);
