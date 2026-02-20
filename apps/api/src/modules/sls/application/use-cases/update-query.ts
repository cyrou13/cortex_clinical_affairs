import type { PrismaClient, Prisma } from '@prisma/client';
import { UpdateQueryInput, generateId } from '@cortex/shared';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { validateBooleanQuery } from '../../domain/value-objects/boolean-query.js';
import { QueryEntity } from '../../domain/entities/query.js';

/**
 * Compute a simple diff between the old and new query strings.
 */
function computeDiff(
  oldQueryString: string,
  newQueryString: string,
): { before: string; after: string } {
  return {
    before: oldQueryString,
    after: newQueryString,
  };
}

export class UpdateQueryUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(queryId: string, input: unknown, userId: string) {
    const parsed = UpdateQueryInput.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i: { message: string }) => i.message).join(', '),
      );
    }

    const { queryString: newQueryString, dateFrom, dateTo } = parsed.data;

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
      throw new ValidationError('Cannot update queries in a locked session');
    }

    // 3. Validate new query syntax
    const validation = validateBooleanQuery(newQueryString);
    if (!validation.valid) {
      throw new ValidationError(`Invalid query syntax: ${validation.errors.join('; ')}`);
    }

    // 4. Use domain entity to create version data
    const entity = new QueryEntity(existing);
    const diff = computeDiff(existing.queryString, newQueryString);
    const versionId = generateId();
    const { newVersion, versionData } = entity.createNewVersion(
      newQueryString,
      diff,
      versionId,
      userId,
    );

    // 5. Save QueryVersion
    await this.prisma.queryVersion.create({
      data: {
        id: versionData.id,
        queryId: versionData.queryId,
        version: versionData.version,
        queryString: versionData.queryString,
        diff: versionData.diff as Prisma.InputJsonValue,
        createdById: versionData.createdById,
      },
    });

    // 6. Update query with new version and queryString
    const updateData: Record<string, unknown> = {
      queryString: newQueryString,
      version: newVersion,
    };
    if (dateFrom !== undefined) updateData.dateFrom = dateFrom ? new Date(dateFrom) : null;
    if (dateTo !== undefined) updateData.dateTo = dateTo ? new Date(dateTo) : null;

    const updated = await this.prisma.slsQuery.update({
      where: { id: queryId },
      data: updateData,
    });

    // 7. Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.query.updated',
        targetType: 'slsQuery',
        targetId: queryId,
        before: {
          queryString: existing.queryString,
          version: existing.version,
        } as unknown as Prisma.InputJsonValue,
        after: {
          queryString: newQueryString,
          version: newVersion,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return updated;
  }
}
