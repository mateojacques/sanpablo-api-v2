import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq, and, isNull } from 'drizzle-orm';

import { db } from '../../config/database.js';
import { users } from '../../db/schema/users.js';
import { env } from '../../config/env.js';
import { AppError, conflict, unauthorized, notFound } from '../../shared/utils/errors.js';

import type { AuthUser, UserRole } from '../../shared/types/index.js';
import type {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from './auth.schemas.js';

const SALT_ROUNDS = 12;

interface UserWithoutPassword {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthResult {
  token: string;
  user: UserWithoutPassword;
}

/**
 * Authentication service handling user registration, login, and profile management.
 */
export const authService = {
  /**
   * Register a new user
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    // Check if email already exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, input.email.toLowerCase()), isNull(users.deletedAt)))
      .limit(1);

    if (existing.length > 0) {
      throw conflict('EMAIL_ALREADY_EXISTS', 'Email is already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: input.email.toLowerCase(),
        passwordHash,
        fullName: input.fullName,
        role: 'buyer',
      })
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    // Generate token
    const token = this.generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role as UserRole,
    });

    return {
      token,
      user: newUser as UserWithoutPassword,
    };
  },

  /**
   * Authenticate user and return token
   */
  async login(input: LoginInput): Promise<AuthResult> {
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, input.email.toLowerCase()), isNull(users.deletedAt)))
      .limit(1);

    if (!user) {
      throw unauthorized('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw unauthorized('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role as UserRole,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  },

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<UserWithoutPassword> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (!user) {
      throw notFound('User', userId);
    }

    return user as UserWithoutPassword;
  },

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<UserWithoutPassword> {
    // If email is being updated, check for conflicts
    if (input.email) {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, input.email.toLowerCase()), isNull(users.deletedAt)))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== userId) {
        throw conflict('EMAIL_ALREADY_EXISTS', 'Email is already in use');
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.fullName) updateData.fullName = input.fullName;
    if (input.email) updateData.email = input.email.toLowerCase();

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    if (!updated) {
      throw notFound('User', userId);
    }

    return updated as UserWithoutPassword;
  },

  /**
   * Change user password
   */
  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    // Get current user
    const [user] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (!user) {
      throw notFound('User', userId);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      input.currentPassword,
      user.passwordHash
    );
    if (!isValidPassword) {
      throw new AppError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);

    // Update password
    await db
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  },

  /**
   * Generate JWT token
   */
  generateToken(payload: AuthUser): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  },

  /**
   * Verify JWT token
   */
  verifyToken(token: string): AuthUser {
    try {
      return jwt.verify(token, env.JWT_SECRET) as AuthUser;
    } catch {
      throw unauthorized('Invalid or expired token');
    }
  },
};
