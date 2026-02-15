import { validateBooleanQuery } from '../value-objects/boolean-query.js';
import type { BooleanQueryValidationResult } from '@cortex/shared';

export interface QueryData {
  id: string;
  sessionId: string;
  name: string;
  queryString: string;
  version: number;
  isActive: boolean;
  parentQueryId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VersionData {
  id: string;
  queryId: string;
  version: number;
  queryString: string;
  diff: unknown;
  createdById: string;
  createdAt: Date;
}

/**
 * Query domain entity encapsulating business logic for systematic literature search queries.
 */
export class QueryEntity {
  constructor(public readonly data: QueryData) {}

  /**
   * Create a new version of the query with an updated query string.
   * Returns the new version number and a version data snapshot.
   */
  createNewVersion(
    newQueryString: string,
    diff: unknown,
    versionId: string,
    userId: string,
  ): { newVersion: number; versionData: Omit<VersionData, 'createdAt'> } {
    const newVersion = this.data.version + 1;

    return {
      newVersion,
      versionData: {
        id: versionId,
        queryId: this.data.id,
        version: newVersion,
        queryString: newQueryString,
        diff,
        createdById: userId,
      },
    };
  }

  /**
   * Duplicate this query with a new ID and reset version to 1.
   */
  duplicate(newId: string, userId: string): QueryData {
    return {
      id: newId,
      sessionId: this.data.sessionId,
      name: `${this.data.name} (copy)`,
      queryString: this.data.queryString,
      version: 1,
      isActive: true,
      parentQueryId: this.data.id,
      createdById: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Validate the syntax of the current query string.
   */
  validateSyntax(): BooleanQueryValidationResult {
    return validateBooleanQuery(this.data.queryString);
  }
}
