import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { verifyPassword, hashPassword } from '../utils/password.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { AuditService } from '../services/audit.service.js';

interface FailedAttempt {
  count: number;
  lockedUntil?: number;
}
// IP + Email rate limiting map for brute-force protection
const failedAttemptsMap = new Map<string, FailedAttempt>();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  rememberMe: z.boolean().optional().default(false),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your new password'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation do not match",
    path: ['confirmPassword'],
  });

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/login
  fastify.post('/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid input parameters',
        details: parseResult.error.format(),
      });
    }

    const { email, password, rememberMe } = parseResult.data;
    const clientKey = `${request.ip}:${email.toLowerCase().trim()}`;

    // 1. Check rate limit
    const attempt = failedAttemptsMap.get(clientKey);
    if (attempt && attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
      const waitMinutes = Math.ceil((attempt.lockedUntil - Date.now()) / 60000);
      return reply.status(429).send({
        success: false,
        error: `Too many failed login attempts. Temporarily locked for security. Please try again in ${waitMinutes} minute(s).`,
      });
    }

    try {
      const userList = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .limit(1);

      if (userList.length === 0) {
        // Record failed attempt
        const curr = failedAttemptsMap.get(clientKey) || { count: 0 };
        curr.count += 1;
        if (curr.count >= 5) {
          curr.lockedUntil = Date.now() + 5 * 60 * 1000;
        }
        failedAttemptsMap.set(clientKey, curr);

        return reply.status(401).send({
          success: false,
          error: 'Invalid email or password',
        });
      }

      const user = userList[0];

      if (!user.isActive) {
        return reply.status(403).send({
          success: false,
          error: 'Account is deactivated. Contact the administrator.',
        });
      }

      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        // Record failed attempt
        const curr = failedAttemptsMap.get(clientKey) || { count: 0 };
        curr.count += 1;
        if (curr.count >= 5) {
          curr.lockedUntil = Date.now() + 5 * 60 * 1000;
        }
        failedAttemptsMap.set(clientKey, curr);

        const remaining = 5 - curr.count;
        return reply.status(401).send({
          success: false,
          error:
            remaining > 0
              ? `Invalid email or password (${remaining} attempt(s) remaining before security lockout)`
              : 'Account temporarily locked due to multiple failed attempts. Try again in 5 minutes.',
        });
      }

      // Success: Clear failed attempts
      failedAttemptsMap.delete(clientKey);

      // Enforce daily end-of-day cutoff: session strictly cannot bridge across midnight to the next morning!
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const secondsUntilMidnight = Math.max(300, Math.floor((endOfDay.getTime() - now.getTime()) / 1000));
      const maxShiftDuration = rememberMe ? 10 * 3600 : 4 * 3600; // max 10h workday shift, or 4h standard
      const tokenExpiresInSeconds = Math.min(secondsUntilMidnight, maxShiftDuration);

      const token = fastify.jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role as 'admin' | 'staff',
          name: user.name,
        },
        { expiresIn: `${tokenExpiresInSeconds}s` }
      );

      await AuditService.log({
        userId: user.id,
        action: 'LOGIN',
        entityName: 'users',
        entityId: user.id,
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        token,
        expiresIn: tokenExpiresInSeconds,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as 'admin' | 'staff',
        },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: 'An unexpected error occurred during login',
      });
    }
  });

  // POST /api/auth/logout
  fastify.post('/logout', { preHandler: [authenticate] }, async (request, reply) => {
    if (request.user) {
      await AuditService.log({
        userId: request.user.id,
        action: 'LOGOUT',
        entityName: 'users',
        entityId: request.user.id,
        ipAddress: request.ip,
      });
    }
    return reply.send({
      success: true,
      message: 'Logged out successfully',
    });
  });

  // GET /api/auth/me
  fastify.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      if (!request.user) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      const userList = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, request.user.id))
        .limit(1);

      if (userList.length === 0) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }

      return reply.send({
        success: true,
        user: userList[0],
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Failed to fetch user profile' });
    }
  });

  // POST /api/auth/change-password
  fastify.post('/change-password', { preHandler: [authenticate] }, async (request, reply) => {
    const parseResult = changePasswordSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: parseResult.error.errors[0]?.message || 'Validation failed',
        details: parseResult.error.format(),
      });
    }

    const { currentPassword, newPassword } = parseResult.data;
    const userId = request.user.id;

    try {
      const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userList.length === 0) {
        return reply.status(404).send({ success: false, error: 'User not found' });
      }

      const user = userList[0];
      const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        return reply.status(400).send({
          success: false,
          error: 'Current password is incorrect. Please verify your current password.',
        });
      }

      const newHash = await hashPassword(newPassword);
      await db
        .update(users)
        .set({
          passwordHash: newHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      await AuditService.log({
        userId,
        action: 'CHANGE_PASSWORD',
        entityName: 'users',
        entityId: userId,
        ipAddress: request.ip,
      });

      return reply.send({
        success: true,
        message: 'Password changed successfully! Please use your new password next time you sign in.',
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({
        success: false,
        error: err.message || 'Failed to change password',
      });
    }
  });
}
