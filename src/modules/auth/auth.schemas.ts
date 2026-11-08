import { z } from 'zod';

/**
 * @openapi
 * components:
 *   schemas:
 *     RegisterInput:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - fullName
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 8
 *         fullName:
 *           type: string
 *           minLength: 2
 *     LoginInput:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *     AuthResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *             user:
 *               $ref: '#/components/schemas/UserProfile'
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *         fullName:
 *           type: string
 *         role:
 *           type: string
 *           enum: [owner, admin, buyer, partner]
 */

export const registerSchema = z.object({
  email: z.string().email('Correo electrónico no válido.'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(100, 'La contraseña es demasiado larga.'),
  fullName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(255, 'El nombre es demasiado largo.'),
});

export const loginSchema = z.object({
  email: z.string().email('Correo electrónico no válido.'),
  password: z.string().min(1, 'La contraseña es obligatoria.'),
});

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(255, 'El nombre es demasiado largo.')
    .optional(),
  email: z.string().email('Correo electrónico no válido.').optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es obligatoria.'),
  newPassword: z
    .string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres.')
    .max(100, 'La contraseña es demasiado larga.'),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
