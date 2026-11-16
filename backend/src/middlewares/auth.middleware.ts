import { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthUserPayload {
  id: string;
  email: string;
  role: 'admin' | 'staff';
  name: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUserPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized: Missing or invalid authorization token',
      });
    }

    const decoded = await request.jwtVerify<AuthUserPayload>();
    request.user = decoded;
  } catch {
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized: Invalid or expired token',
    });
  }
}
