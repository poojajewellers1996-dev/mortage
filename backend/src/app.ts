import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import * as dotenv from 'dotenv';

import { authRoutes } from './routes/auth.routes.js';
import { customerRoutes } from './routes/customer.routes.js';
import { pledgeRoutes } from './routes/pledge.routes.js';
import { articleRoutes } from './routes/article.routes.js';
import { paymentRoutes } from './routes/payment.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { uploadRoutes } from './routes/upload.routes.js';
import { settingsRoutes } from './routes/settings.routes.js';
import { client } from './db/index.js';

dotenv.config();

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
    },
    bodyLimit: 15 * 1024 * 1024, // 15MB limit for photos/base64
  });

  // Security Headers
  app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  // CORS Configuration
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return cb(null, true);
      }
      if (origin.endsWith('.vercel.app')) {
        return cb(null, true);
      }
      return cb(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true,
  });

  // Rate Limiting
  app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });

  // Multipart File Upload Support
  app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  // JWT Authentication Plugin
  app.register(jwt, {
    secret: process.env.JWT_SECRET || 'super_secret_jwt_key_girvi_system_change_in_production_2026',
  });

  // Health-check Endpoint
  app.get('/health', async (request, reply) => {
    let dbStatus = 'healthy';
    try {
      await client`SELECT 1`;
    } catch {
      dbStatus = 'degraded_or_unreachable';
    }

    return reply.send({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'Girvi Management Backend API',
      version: '1.0.0',
      database: dbStatus,
    });
  });

  // Register REST API Routes
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(customerRoutes, { prefix: '/api/customers' });
  app.register(pledgeRoutes, { prefix: '/api/pledges' });
  app.register(articleRoutes, { prefix: '/api' });
  app.register(paymentRoutes, { prefix: '/api/payments' });
  app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  app.register(uploadRoutes, { prefix: '/api/upload' });
  app.register(settingsRoutes, { prefix: '/api/settings' });

  // Centralized Error Handler
  app.setErrorHandler((error: any, request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      success: false,
      error: error.message || 'Internal Server Error',
      statusCode,
    });
  });

  return app;
}
