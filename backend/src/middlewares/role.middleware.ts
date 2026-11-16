import { FastifyRequest, FastifyReply } from 'fastify';

export function requireRole(allowedRoles: ('admin' | 'staff')[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized: Authentication required',
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        success: false,
        error: `Forbidden: This operation requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
    }
  };
}
