import { builder } from '../../../graphql/builder.js';

export const TaskStatusEnum = builder.enumType('TaskStatus', {
  values: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const,
});

export const AsyncTaskType = builder.objectRef<{
  id: string;
  type: string;
  status: string;
  progress: number;
  total: number | null;
  result: unknown;
  error: string | null;
  metadata: unknown;
  createdBy: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>('AsyncTask');

builder.objectType(AsyncTaskType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    type: t.exposeString('type'),
    status: t.exposeString('status'),
    progress: t.exposeFloat('progress'),
    total: t.exposeFloat('total', { nullable: true }),
    result: t.expose('result', { type: 'JSON', nullable: true }),
    error: t.exposeString('error', { nullable: true }),
    metadata: t.expose('metadata', { type: 'JSON', nullable: true }),
    createdBy: t.exposeString('createdBy'),
    startedAt: t.expose('startedAt', { type: 'DateTime', nullable: true }),
    completedAt: t.expose('completedAt', { type: 'DateTime', nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

export const TaskProgressEventType = builder.objectRef<{
  taskId: string;
  type: string;
  status: string;
  progress: number;
  total: number | undefined;
  current: number | undefined;
  eta: number | undefined;
  message: string | undefined;
}>('TaskProgressEvent');

builder.objectType(TaskProgressEventType, {
  fields: (t) => ({
    taskId: t.exposeString('taskId'),
    type: t.exposeString('type'),
    status: t.exposeString('status'),
    progress: t.exposeFloat('progress'),
    total: t.exposeFloat('total', { nullable: true }),
    current: t.exposeFloat('current', { nullable: true }),
    eta: t.exposeFloat('eta', { nullable: true }),
    message: t.exposeString('message', { nullable: true }),
  }),
});
