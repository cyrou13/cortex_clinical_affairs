import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureSessionNotLocked } from './check-session-lock.js';

function makePrisma(session: Record<string, unknown> | null) {
  return {
    slsSession: {
      findUnique: vi.fn().mockResolvedValue(session),
    },
  } as any;
}

describe('ensureSessionNotLocked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not throw for unlocked session', async () => {
    const prisma = makePrisma({ id: 's-1', status: 'SCREENING' });

    await expect(ensureSessionNotLocked(prisma, 's-1')).resolves.toBeUndefined();
  });

  it('does not throw for DRAFT session', async () => {
    const prisma = makePrisma({ id: 's-1', status: 'DRAFT' });

    await expect(ensureSessionNotLocked(prisma, 's-1')).resolves.toBeUndefined();
  });

  it('throws LockConflictError for LOCKED session', async () => {
    const prisma = makePrisma({ id: 's-1', status: 'LOCKED' });

    await expect(ensureSessionNotLocked(prisma, 's-1')).rejects.toThrow('locked');
  });

  it('throws NotFoundError for missing session', async () => {
    const prisma = makePrisma(null);

    await expect(ensureSessionNotLocked(prisma, 'missing')).rejects.toThrow('not found');
  });

  it('passes correct session ID to query', async () => {
    const prisma = makePrisma({ id: 's-42', status: 'SCREENING' });

    await ensureSessionNotLocked(prisma, 's-42');

    expect(prisma.slsSession.findUnique).toHaveBeenCalledWith({
      where: { id: 's-42' },
      select: { id: true, status: true },
    });
  });
});
