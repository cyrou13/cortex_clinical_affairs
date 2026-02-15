import type { FastifyRequest, FastifyReply } from 'fastify';
import type { JwtService } from '../../modules/auth/infrastructure/services/jwt-service.js';
import { logger } from '../utils/logger.js';

export interface AuthenticatedUser {
  id: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: AuthenticatedUser | null;
  }
}

export function createAuthMiddleware(jwtService: JwtService) {
  return async function authMiddleware(request: FastifyRequest, _reply: FastifyReply) {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      request.currentUser = null;
      return;
    }

    const token = authHeader.slice(7);

    try {
      const payload = jwtService.verifyAccessToken(token);
      request.currentUser = { id: payload.sub, role: payload.role };
    } catch {
      logger.debug('Invalid or expired access token');
      request.currentUser = null;
    }
  };
}
