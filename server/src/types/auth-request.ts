// server/src/types/auth-request.ts - 강화된 타입 정의
import { Request } from 'express';
import { BoardInstance } from '../models/Board';

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: string;
  email?: string;
}

export interface AuthRequest extends Request {
  user: AuthenticatedUser;
  board?: {
    id: string;
    name: string;
    isPersonal: boolean;
    permissions: {
      canRead: boolean;
      canWrite: boolean;
      canDelete: boolean;
    };
  };
}

export interface BoardPermissionCheck {
  hasAccess: boolean;
  board?: BoardInstance;
  reason?: string;
}

export interface AccessibleBoard {
  id: string;
  name: string;
  description: string | null;
  order: number;
  isPersonal: boolean;
  ownerId?: string;
  permissions: {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
  };
}

export interface PersonalFolderResult {
  board: BoardInstance;
  created: boolean;
}
