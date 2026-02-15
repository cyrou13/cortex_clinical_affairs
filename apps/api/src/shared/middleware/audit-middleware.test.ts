import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GraphQLContext } from '../../graphql/context.js';

vi.mock('../utils/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { withAudit } from './audit-middleware.js';

function makeCtx(overrides: Partial<GraphQLContext> = {}): GraphQLContext {
  return {
    prisma: {
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    } as unknown as GraphQLContext['prisma'],
    user: { id: 'user-1', role: 'ADMIN' },
    requestId: 'req-1',
    reply: {} as GraphQLContext['reply'],
    ...overrides,
  } as GraphQLContext;
}

describe('Audit Middleware – withAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs audit entry with correct fields on success', async () => {
    const resolver = vi.fn().mockResolvedValue({ id: 'doc-1', title: 'Updated' });
    const ctx = makeCtx();

    const wrapped = withAudit(
      {
        action: 'document.update',
        targetType: 'document',
        getTargetId: (args: any) => args.id,
      },
      resolver,
    );

    const result = await wrapped({}, { id: 'doc-1' }, ctx);

    expect(result).toEqual({ id: 'doc-1', title: 'Updated' });
    expect(ctx.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        action: 'document.update',
        targetType: 'document',
        targetId: 'doc-1',
      }),
    });
  });

  it('captures "before" state when getBefore is provided', async () => {
    const beforeState = { id: 'doc-1', title: 'Old Title' };
    const afterState = { id: 'doc-1', title: 'New Title' };
    const resolver = vi.fn().mockResolvedValue(afterState);
    const getBefore = vi.fn().mockResolvedValue(beforeState);
    const ctx = makeCtx();

    const wrapped = withAudit(
      {
        action: 'document.update',
        targetType: 'document',
        getTargetId: (args: any) => args.id,
        getBefore,
      },
      resolver,
    );

    await wrapped({}, { id: 'doc-1' }, ctx);

    expect(getBefore).toHaveBeenCalled();
    expect(ctx.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'document.update',
        before: beforeState,
        after: afterState,
      }),
    });
  });

  it('logs failed attempt with .failed suffix when resolver throws', async () => {
    const error = new Error('Database connection lost');
    const resolver = vi.fn().mockRejectedValue(error);
    const ctx = makeCtx();

    const wrapped = withAudit(
      {
        action: 'document.delete',
        targetType: 'document',
        getTargetId: (args: any) => args.id,
      },
      resolver,
    );

    await expect(wrapped({}, { id: 'doc-1' }, ctx)).rejects.toThrow('Database connection lost');

    expect(ctx.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'document.delete.failed',
        targetType: 'document',
        targetId: 'doc-1',
      }),
    });
  });

  it('includes error details in metadata on failure', async () => {
    const error = new Error('Validation failed');
    const resolver = vi.fn().mockRejectedValue(error);
    const ctx = makeCtx();

    const wrapped = withAudit(
      {
        action: 'document.create',
        targetType: 'document',
        getTargetId: () => 'new',
      },
      resolver,
    );

    await expect(wrapped({}, {}, ctx)).rejects.toThrow('Validation failed');

    expect(ctx.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'document.create.failed',
        metadata: expect.objectContaining({
          error: expect.objectContaining({
            message: 'Validation failed',
          }),
        }),
      }),
    });
  });

  it('returns the resolver result without interference', async () => {
    const expected = { id: 'p-1', name: 'Project Alpha', status: 'ACTIVE' };
    const resolver = vi.fn().mockResolvedValue(expected);
    const ctx = makeCtx();

    const wrapped = withAudit(
      {
        action: 'project.create',
        targetType: 'project',
        getTargetId: () => 'p-1',
      },
      resolver,
    );

    const result = await wrapped({}, {}, ctx);

    expect(result).toEqual(expected);
    expect(resolver).toHaveBeenCalledWith({}, {}, ctx);
  });

  it('uses anonymous userId when user is null', async () => {
    const resolver = vi.fn().mockResolvedValue({ id: 'doc-1' });
    const ctx = makeCtx({ user: null });

    const wrapped = withAudit(
      {
        action: 'document.read',
        targetType: 'document',
        getTargetId: () => 'doc-1',
      },
      resolver,
    );

    const result = await wrapped({}, {}, ctx);

    expect(result).toEqual({ id: 'doc-1' });
    expect(ctx.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'anonymous',
      }),
    });
  });
});
