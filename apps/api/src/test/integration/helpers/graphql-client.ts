/**
 * GraphQL Test Client
 *
 * Lightweight helper that sends GraphQL operations via Fastify's `inject()`,
 * avoiding any real network traffic.
 */
import type { FastifyInstance } from 'fastify';

interface GqlResult {
  data?: any;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
}

/**
 * Execute a GraphQL query or mutation against a test Fastify app.
 */
export async function gql(
  app: FastifyInstance,
  query: string,
  variables?: Record<string, unknown>,
): Promise<GqlResult> {
  const res = await app.inject({
    method: 'POST',
    url: '/graphql',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({ query, variables }),
  });

  return JSON.parse(res.payload) as GqlResult;
}
