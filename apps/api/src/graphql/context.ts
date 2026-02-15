import type { PrismaClient } from '@prisma/client';
import type { FastifyReply } from 'fastify';

export interface GraphQLContext {
  prisma: PrismaClient;
  user: { id: string; role: string } | null;
  requestId: string;
  reply: FastifyReply;
}
