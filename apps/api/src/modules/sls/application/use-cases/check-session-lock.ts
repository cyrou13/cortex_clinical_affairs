import type { PrismaClient } from '@prisma/client';
import { LockConflictError, NotFoundError } from '../../../../shared/errors/index.js';

/**
 * Guard function: throws LockConflictError if the session is locked.
 * Use in every SLS write use case before performing mutations.
 */
export async function ensureSessionNotLocked(
  prisma: PrismaClient,
  sessionId: string,
): Promise<void> {
  const session = await prisma.slsSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true },
  });

  if (!session) {
    throw new NotFoundError('SlsSession', sessionId);
  }

  if (session.status === 'LOCKED') {
    throw new LockConflictError('SlsSession', sessionId);
  }
}
