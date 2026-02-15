import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageUsersUseCase } from './manage-users.js';
import { ValidationError, NotFoundError } from '../../../../shared/errors/index.js';

function makePrisma() {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)),
  } as unknown as Parameters<typeof ManageUsersUseCase.prototype.createUser>[0] extends infer _T
    ? ConstructorParameters<typeof ManageUsersUseCase>[0]
    : never;
  return prisma;
}

describe('ManageUsersUseCase', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let useCase: ManageUsersUseCase;

  beforeEach(() => {
    prisma = makePrisma();
    useCase = new ManageUsersUseCase(prisma as any);
  });

  describe('createUser', () => {
    it('creates a user with valid input', async () => {
      (prisma as any).user.findUnique.mockResolvedValue(null);
      (prisma as any).user.create.mockResolvedValue({
        id: 'u-new',
        email: 'new@example.com',
        name: 'New User',
        role: 'CLINICAL_SPECIALIST',
      });

      const result = await useCase.createUser(
        { email: 'new@example.com', name: 'New User', role: 'CLINICAL_SPECIALIST' },
        'admin-1',
      );

      expect(result.email).toBe('new@example.com');
      expect((prisma as any).auditLog.create).toHaveBeenCalled();
    });

    it('throws when email already exists', async () => {
      (prisma as any).user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        useCase.createUser(
          { email: 'dup@example.com', name: 'Dup', role: 'AUDITOR' },
          'admin-1',
        ),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateUser', () => {
    it('updates user name and role', async () => {
      (prisma as any).user.findUnique.mockResolvedValue({
        id: 'u-1',
        name: 'Old Name',
        role: 'AUDITOR',
      });
      (prisma as any).user.update.mockResolvedValue({
        id: 'u-1',
        name: 'New Name',
        role: 'EXECUTIVE',
      });

      const result = await useCase.updateUser('u-1', { name: 'New Name', role: 'EXECUTIVE' }, 'admin-1');
      expect(result.name).toBe('New Name');
    });

    it('throws when user not found', async () => {
      (prisma as any).user.findUnique.mockResolvedValue(null);
      await expect(useCase.updateUser('missing', { name: 'X' }, 'admin-1')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('deactivateUser', () => {
    it('deactivates user and deletes sessions', async () => {
      (prisma as any).user.findUnique.mockResolvedValue({
        id: 'u-1',
        role: 'CLINICAL_SPECIALIST',
        isActive: true,
      });
      (prisma as any).user.update.mockResolvedValue({ id: 'u-1', isActive: false });
      (prisma as any).user.count.mockResolvedValue(2);

      const result = await useCase.deactivateUser('u-1', 'admin-1');
      expect(result.isActive).toBe(false);
      expect((prisma as any).session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u-1' },
      });
    });

    it('prevents deactivating self', async () => {
      (prisma as any).user.findUnique.mockResolvedValue({
        id: 'admin-1',
        role: 'ADMIN',
        isActive: true,
      });

      await expect(useCase.deactivateUser('admin-1', 'admin-1')).rejects.toThrow(
        'Cannot deactivate your own account',
      );
    });

    it('prevents deactivating last admin', async () => {
      (prisma as any).user.findUnique.mockResolvedValue({
        id: 'u-1',
        role: 'ADMIN',
        isActive: true,
      });
      (prisma as any).user.count.mockResolvedValue(1);

      await expect(useCase.deactivateUser('u-1', 'admin-2')).rejects.toThrow(
        'Cannot deactivate the last active Admin',
      );
    });
  });

  describe('reactivateUser', () => {
    it('reactivates an inactive user', async () => {
      (prisma as any).user.findUnique.mockResolvedValue({ id: 'u-1', isActive: false });
      (prisma as any).user.update.mockResolvedValue({ id: 'u-1', isActive: true });

      const result = await useCase.reactivateUser('u-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });

  describe('listUsers', () => {
    it('returns paginated user list', async () => {
      (prisma as any).user.findMany.mockResolvedValue([
        { id: 'u-1', name: 'User 1' },
        { id: 'u-2', name: 'User 2' },
      ]);
      (prisma as any).user.count.mockResolvedValue(2);

      const result = await useCase.listUsers({ limit: 10 });
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('filters by role', async () => {
      (prisma as any).user.findMany.mockResolvedValue([]);
      (prisma as any).user.count.mockResolvedValue(0);

      await useCase.listUsers({ role: 'ADMIN' });
      expect((prisma as any).user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'ADMIN' }),
        }),
      );
    });

    it('filters by search query', async () => {
      (prisma as any).user.findMany.mockResolvedValue([]);
      (prisma as any).user.count.mockResolvedValue(0);

      await useCase.listUsers({ search: 'john' });
      expect((prisma as any).user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: { contains: 'john', mode: 'insensitive' } }),
            ]),
          }),
        }),
      );
    });
  });
});
