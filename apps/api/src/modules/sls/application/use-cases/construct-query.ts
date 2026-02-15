import type { PrismaClient, Prisma } from '@prisma/client';
import { CreateQueryInput, generateId } from '@cortex/shared';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { validateBooleanQuery } from '../../domain/value-objects/boolean-query.js';

export class ConstructQueryUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(
    input: unknown,
    userId: string,
  ) {
    const parsed = CreateQueryInput.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues.map((i: { message: string }) => i.message).join(', '),
      );
    }

    const { sessionId, name, queryString } = parsed.data;

    // 1. Check session exists and is not LOCKED
    const session = await this.prisma.slsSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('SlsSession', sessionId);
    }

    if (session.status === 'LOCKED') {
      throw new ValidationError('Cannot add queries to a locked session');
    }

    // 2. Validate boolean query syntax
    const validation = validateBooleanQuery(queryString);
    if (!validation.valid) {
      throw new ValidationError(
        `Invalid query syntax: ${validation.errors.join('; ')}`,
      );
    }

    // 3. Create query with version 1
    const queryId = generateId();
    const query = await this.prisma.slsQuery.create({
      data: {
        id: queryId,
        sessionId,
        name,
        queryString,
        version: 1,
        isActive: true,
        createdById: userId,
      },
    });

    // 4. Create initial QueryVersion
    const versionId = generateId();
    await this.prisma.queryVersion.create({
      data: {
        id: versionId,
        queryId,
        version: 1,
        queryString,
        diff: null,
        createdById: userId,
      },
    });

    // 5. Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'sls.query.created',
        targetType: 'slsQuery',
        targetId: queryId,
        after: { name, queryString, sessionId, version: 1 } as unknown as Prisma.InputJsonValue,
      },
    });

    // 6. Return query
    return query;
  }
}
