import SchemaBuilder from '@pothos/core';
import type { GraphQLContext } from './context.js';
import { DateTimeScalar, UUIDScalar } from './scalars.js';

export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  Scalars: {
    DateTime: {
      Input: Date;
      Output: Date | string;
    };
    UUID: {
      Input: string;
      Output: string;
    };
    JSON: {
      Input: unknown;
      Output: unknown;
    };
  };
}>({});

builder.addScalarType('DateTime', DateTimeScalar);
builder.addScalarType('UUID', UUIDScalar);
builder.scalarType('JSON', {
  serialize: (value) => value,
  parseValue: (value) => value,
});

const ServerInfoType = builder.objectType(
  builder.objectRef<{ status: string; timestamp: string; version: string }>('ServerInfo'),
  {
    fields: (t) => ({
      status: t.exposeString('status'),
      timestamp: t.exposeString('timestamp'),
      version: t.exposeString('version'),
    }),
  },
);

builder.queryType({
  fields: (t) => ({
    health: t.field({
      type: 'String',
      resolve: () => 'ok',
    }),
    serverInfo: t.field({
      type: ServerInfoType,
      resolve: () => ({
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
        version: '0.1.0',
      }),
    }),
  }),
});

builder.mutationType({
  fields: (t) => ({
    _placeholder: t.field({
      type: 'Boolean',
      description: 'Placeholder mutation - will be replaced by real mutations',
      resolve: () => true,
    }),
  }),
});

builder.subscriptionType({
  fields: (t) => ({
    _placeholder: t.boolean({
      description: 'Placeholder subscription - will be replaced by real subscriptions',
      subscribe: async function* () {
        yield true;
      },
      resolve: (value: boolean) => value,
    }),
  }),
});
