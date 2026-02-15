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
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null as any);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'u-new',
        email: 'new@example.com',
        name: 'New User',
        role: 'CLINICAL_SPECIALIST',
      } as any);

      const result = await useCase.createUser(
        { email: 'new@example.com', name: 'New User', role: 'CLINICAL_SPECIALIST' },
        'admin-1',
      );

      expect(result.email).toBe('new@example.com');
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('throws when email already exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'existing' } as any);

      await expect(
        useCase.createUser({ email: 'dup@example.com', name: 'Dup', role: 'AUDITOR' }, 'admin-1'),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateUser', () => {
    it('updates user name and role', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'u-1',
        name: 'Old Name',
        role: 'AUDITOR',
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: 'u-1',
        name: 'New Name',
        role: 'EXECUTIVE',
      } as any);

      const result = await useCase.updateUser(
        'u-1',
        { name: 'New Name', role: 'EXECUTIVE' },
        'admin-1',
      );
      expect(result.name).toBe('New Name');
    });

    it('throws when user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null as any);
      await expect(useCase.updateUser('missing', { name: 'X' }, 'admin-1')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('deactivateUser', () => {
    it('deactivates user and deletes sessions', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'u-1',
        role: 'CLINICAL_SPECIALIST',
        isActive: true,
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({ id: 'u-1', isActive: false } as any);
      vi.mocked(prisma.user.count).mockResolvedValue(2);

      const result = await useCase.deactivateUser('u-1', 'admin-1');
      expect(result.isActive).toBe(false);
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u-1' },
      });
    });

    it('prevents deactivating self', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'admin-1',
        role: 'ADMIN',
        isActive: true,
      } as any);

      await expect(useCase.deactivateUser('admin-1', 'admin-1')).rejects.toThrow(
        'Cannot deactivate your own account',
      );
    });

    it('prevents deactivating last admin', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'u-1',
        role: 'ADMIN',
        isActive: true,
      } as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      await expect(useCase.deactivateUser('u-1', 'admin-2')).rejects.toThrow(
        'Cannot deactivate the last active Admin',
      );
    });
  });

  describe('reactivateUser', () => {
    it('reactivates an inactive user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u-1', isActive: false } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({ id: 'u-1', isActive: true } as any);

      const result = await useCase.reactivateUser('u-1', 'admin-1');
      expect(result.isActive).toBe(true);
    });
  });

  describe('listUsers', () => {
    it('returns paginated user list', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: 'u-1', name: 'User 1' },
        { id: 'u-2', name: 'User 2' },
      ] as any);
      vi.mocked(prisma.user.count).mockResolvedValue(2);

      const result = await useCase.listUsers({ limit: 10 });
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('filters by role', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      await useCase.listUsers({ role: 'ADMIN' });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'ADMIN' }),
        }),
      );
    });

    it('filters by search query', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      await useCase.listUsers({ search: 'john' });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
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
