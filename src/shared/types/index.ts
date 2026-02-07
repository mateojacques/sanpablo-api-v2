import type { Request } from 'express';

// User roles
export type UserRole = 'owner' | 'admin' | 'buyer' | 'partner';

// Authenticated user payload (from JWT)
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

// Extend Express Request with user
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  data: T;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiListResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
