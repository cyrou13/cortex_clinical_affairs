import { GraphQLScalarType, Kind } from 'graphql';

export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO 8601 date-time string',
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return value;
    }
    throw new Error('Invalid DateTime value');
  },
  parseValue(value: unknown): Date {
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid DateTime value');
      }
      return date;
    }
    throw new Error('Invalid DateTime value');
  },
  parseLiteral(ast): Date {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    throw new Error('Invalid DateTime value');
  },
});

export const UUIDScalar = new GraphQLScalarType({
  name: 'UUID',
  description: 'UUID string',
  serialize(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    throw new Error('Invalid UUID value');
  },
  parseValue(value: unknown): string {
    if (typeof value === 'string') {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error('Invalid UUID value');
      }
      return value;
    }
    throw new Error('Invalid UUID value');
  },
  parseLiteral(ast): string {
    if (ast.kind === Kind.STRING) {
      return ast.value;
    }
    throw new Error('Invalid UUID value');
  },
});
