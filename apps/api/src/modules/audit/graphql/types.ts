import { builder } from '../../../graphql/builder.js';

export const AuditLogType = builder.objectRef<{
  id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  before: unknown;
  after: unknown;
  metadata: unknown;
  timestamp: Date;
}>('AuditLog');

builder.objectType(AuditLogType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    userId: t.exposeString('userId'),
    action: t.exposeString('action'),
    targetType: t.exposeString('targetType'),
    targetId: t.exposeString('targetId'),
    before: t.expose('before', { type: 'JSON', nullable: true }),
    after: t.expose('after', { type: 'JSON', nullable: true }),
    metadata: t.expose('metadata', { type: 'JSON', nullable: true }),
    timestamp: t.expose('timestamp', { type: 'DateTime' }),
  }),
});
