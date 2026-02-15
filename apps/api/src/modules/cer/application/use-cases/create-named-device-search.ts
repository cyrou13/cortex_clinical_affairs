import type { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../../shared/errors/index.js';
import { createNamedDeviceSearch } from '../../domain/entities/named-device-search.js';

interface CreateNamedDeviceSearchInput {
  cerVersionId: string;
  deviceName: string;
  keywords: string[];
  databases: string[];
  userId: string;
}

interface CreateNamedDeviceSearchResult {
  searchId: string;
  deviceName: string;
  databases: string[];
  status: string;
}

export class CreateNamedDeviceSearchUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: CreateNamedDeviceSearchInput): Promise<CreateNamedDeviceSearchResult> {
    const { cerVersionId, deviceName, keywords, databases, userId } = input;

    // Verify CER version exists
    const cerVersion = await this.prisma.cerVersion.findUnique({
      where: { id: cerVersionId },
      select: { id: true, status: true },
    });

    if (!cerVersion) {
      throw new NotFoundError('CerVersion', cerVersionId);
    }

    if (cerVersion.status === 'LOCKED') {
      throw new ValidationError('Cannot create search on a locked CER version');
    }

    // Create domain entity (validates inputs)
    const search = createNamedDeviceSearch(cerVersionId, deviceName, keywords, databases);

    // Persist
    await this.prisma.namedDeviceSearch.create({
      data: {
        id: search.id,
        cerVersionId: search.cerVersionId,
        deviceName: search.deviceName,
        keywords: search.keywords,
        databases: search.databases,
        status: search.status,
        totalFindings: 0,
        createdById: userId,
      },
    });

    return {
      searchId: search.id,
      deviceName: search.deviceName,
      databases: search.databases,
      status: search.status,
    };
  }
}
