import { ValidationError } from '../../../../shared/errors/index.js';

export const SEARCH_STATUSES = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL'] as const;
export type SearchStatus = (typeof SEARCH_STATUSES)[number];

export const VIGILANCE_DATABASES = ['MAUDE', 'ANSM', 'BfArM', 'AFMPS'] as const;
export type VigilanceDatabase = (typeof VIGILANCE_DATABASES)[number];

export interface NamedDeviceSearchData {
  id: string;
  cerVersionId: string;
  deviceName: string;
  keywords: string[];
  databases: VigilanceDatabase[];
  status: SearchStatus;
  totalFindings: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export function createNamedDeviceSearch(
  cerVersionId: string,
  deviceName: string,
  keywords: string[],
  databases: string[],
): NamedDeviceSearchData {
  if (!deviceName.trim()) {
    throw new ValidationError('Device name is required');
  }

  if (keywords.length === 0) {
    throw new ValidationError('At least one keyword is required');
  }

  if (databases.length === 0) {
    throw new ValidationError('At least one database must be selected');
  }

  for (const db of databases) {
    if (!VIGILANCE_DATABASES.includes(db as VigilanceDatabase)) {
      throw new ValidationError(`Invalid vigilance database: ${db}`);
    }
  }

  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    cerVersionId,
    deviceName: deviceName.trim(),
    keywords: keywords.map((k) => k.trim()).filter((k) => k.length > 0),
    databases: databases as VigilanceDatabase[],
    status: 'PENDING',
    totalFindings: 0,
    startedAt: null,
    completedAt: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateSearchStatus(
  search: NamedDeviceSearchData,
  status: SearchStatus,
  options?: {
    totalFindings?: number;
    errorMessage?: string;
  },
): NamedDeviceSearchData {
  const now = new Date().toISOString();

  return {
    ...search,
    status,
    totalFindings: options?.totalFindings ?? search.totalFindings,
    startedAt: status === 'RUNNING' ? now : search.startedAt,
    completedAt: status === 'COMPLETED' || status === 'FAILED' || status === 'PARTIAL' ? now : search.completedAt,
    errorMessage: options?.errorMessage ?? search.errorMessage,
    updatedAt: now,
  };
}

export function addFinding(
  search: NamedDeviceSearchData,
  count: number = 1,
): NamedDeviceSearchData {
  return {
    ...search,
    totalFindings: search.totalFindings + count,
    updatedAt: new Date().toISOString(),
  };
}
