import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '../utils/password.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { AuditService } from '../services/audit.service.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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

    const { email, password } = parseResult.data;

    try {
      const userList = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .limit(1);

      if (userList.length === 0) {
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
        return reply.status(401).send({
          success: false,
          error: 'Invalid email or password',
        });
      }

      const token = fastify.jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
        { expiresIn: '7d' }
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
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
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
}
