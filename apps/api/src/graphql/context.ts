import type { PrismaClient } from '@prisma/client';

export interface GraphQLContext {
  prisma: PrismaClient;
  user: { id: string; role: string } | null;
  requestId: string;
}
