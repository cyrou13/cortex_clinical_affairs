export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface Edge<T> {
  node: T;
  cursor: string;
}

export interface OffsetPagination {
  offset: number;
  limit: number;
}

export interface CursorPagination {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}
