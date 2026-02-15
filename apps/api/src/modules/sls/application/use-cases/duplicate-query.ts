import type { PrismaClient, Prisma } from '@prisma/client';
import { generateId } from '@cortex/shared';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { QueryEntity } from '../../domain/entities/query.js';

export class DuplicateQueryUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(queryId: string, userId: string) {
    // 1. Find existing query
    const existing = await this.prisma.slsQuery.findUnique({
      where: { id: queryId },
    });

    if (!existing) {
      throw new NotFoundError('SlsQuery', queryId);
    }

    // 2. Check session is not LOCKED
    const session = await this.prisma.slsSession.findUnique({
      where: { id: existing.sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', existing.sessionId);
    }

    if (session.status === 'LOCKED') {
      throw new ValidationError('Cannot duplicate queries in a locked session');
    }

    // 3. Use domain entity to build duplicate data
    const entity = new QueryEntity(existing);
    const newId = generateId();
    const duplicateData = entity.duplicate(newId, userId);

    // 4. Create duplicated query
    const duplicated = await this.prisma.slsQuery.create({
      data: {
        id: duplicateData.id,
        sessionId: duplicateData.sessionId,
        name: duplicateData.name,
        queryString: duplicateData.queryString,
        version: 1,
        isActive: true,
        parentQueryId: duplicateData.parentQueryId,
        createdById: userId,
      },
    });

    // 5. Create initial version for the duplicate
    const versionId = generateId();
    await this.prisma.queryVersion.create({
      data: {
        id: versionId,
        queryId: newId,
        version: 1,
        queryString: duplicateData.queryString,
        diff: null,
        createdById: userId,
      },
    });

    // 6. Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.query.duplicated',
        targetType: 'slsQuery',
        targetId: newId,
        after: {
          name: duplicateData.name,
          queryString: duplicateData.queryString,
          parentQueryId: duplicateData.parentQueryId,
          sessionId: duplicateData.sessionId,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return duplicated;
  }
}
