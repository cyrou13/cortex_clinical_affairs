import { z } from 'zod';
import { ArticleStatusEnum } from './sls-session.schema.js';

// --- Article Metadata ---

export const ArticleMetadata = z.object({
  title: z.string().min(1, 'Title is required'),
  abstract: z.string().optional(),
  authors: z.array(z.string()).optional(),
  doi: z.string().optional(),
  pmid: z.string().optional(),
  publicationDate: z.string().optional(),
  journal: z.string().optional(),
  sourceDatabase: z.string().optional(),
});
export type ArticleMetadata = z.infer<typeof ArticleMetadata>;

// --- Article Filter ---

export const ArticleFilter = z.object({
  status: ArticleStatusEnum.optional(),
  yearFrom: z.number().int().min(1900).max(2100).optional(),
  yearTo: z.number().int().min(1900).max(2100).optional(),
  sourceDatabase: z.string().optional(),
  searchText: z.string().optional(),
  pdfStatus: z.string().optional(),
});
export type ArticleFilter = z.infer<typeof ArticleFilter>;

// --- Paginated Articles ---

export interface PaginatedArticles {
  items: Array<{
    id: string;
    sessionId: string;
    title: string;
    abstract: string | null;
    authors: unknown;
    doi: string | null;
    pmid: string | null;
    publicationDate: Date | null;
    journal: string | null;
    sourceDatabase: string | null;
    status: string;
    relevanceScore: number | null;
    aiExclusionCode: string | null;
    customFilterScore: number | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  offset: number;
  limit: number;
}

// --- Deduplication Stats ---

export interface DeduplicationStats {
  totalBefore: number;
  totalAfter: number;
  duplicatesByDoi: number;
  duplicatesByPmid: number;
  duplicatesByTitle: number;
}

// --- Import Articles Input ---

export const ImportArticlesInput = z.object({
  sessionId: z.string().uuid('Valid session ID is required'),
  queryId: z.string().uuid('Valid query ID is required'),
  executionId: z.string().uuid('Valid execution ID is required'),
  articles: z.array(ArticleMetadata).min(1, 'At least one article is required'),
});
export type ImportArticlesInput = z.infer<typeof ImportArticlesInput>;
