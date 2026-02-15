import { builder } from '../../../graphql/builder.js';

export const LlmConfigObjectType = builder.objectRef<{
  id: string;
  level: string;
  projectId: string | null;
  taskType: string | null;
  provider: string;
  model: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}>('LlmConfig');

builder.objectType(LlmConfigObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    level: t.exposeString('level'),
    projectId: t.exposeString('projectId', { nullable: true }),
    taskType: t.exposeString('taskType', { nullable: true }),
    provider: t.exposeString('provider'),
    model: t.exposeString('model'),
    isActive: t.exposeBoolean('isActive'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

export const LlmCostRecordObjectType = builder.objectRef<{
  id: string;
  projectId: string | null;
  taskType: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  createdAt: Date;
}>('LlmCostRecord');

builder.objectType(LlmCostRecordObjectType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    projectId: t.exposeString('projectId', { nullable: true }),
    taskType: t.exposeString('taskType'),
    provider: t.exposeString('provider'),
    model: t.exposeString('model'),
    promptTokens: t.exposeInt('promptTokens'),
    completionTokens: t.exposeInt('completionTokens'),
    costUsd: t.exposeFloat('costUsd'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

const ProviderCostBreakdownType = builder.objectRef<{
  costUsd: number;
  promptTokens: number;
  completionTokens: number;
  requestCount: number;
}>('ProviderCostBreakdown');

builder.objectType(ProviderCostBreakdownType, {
  fields: (t) => ({
    costUsd: t.exposeFloat('costUsd'),
    promptTokens: t.exposeInt('promptTokens'),
    completionTokens: t.exposeInt('completionTokens'),
    requestCount: t.exposeInt('requestCount'),
  }),
});

const CostBreakdownEntryType = builder.objectRef<{
  key: string;
  costUsd: number;
  promptTokens: number;
  completionTokens: number;
  requestCount: number;
}>('CostBreakdownEntry');

builder.objectType(CostBreakdownEntryType, {
  fields: (t) => ({
    key: t.exposeString('key'),
    costUsd: t.exposeFloat('costUsd'),
    promptTokens: t.exposeInt('promptTokens'),
    completionTokens: t.exposeInt('completionTokens'),
    requestCount: t.exposeInt('requestCount'),
  }),
});

export const LlmCostSummaryType = builder.objectRef<{
  totalCostUsd: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  byProvider: Array<{
    key: string;
    costUsd: number;
    promptTokens: number;
    completionTokens: number;
    requestCount: number;
  }>;
  byTaskType: Array<{
    key: string;
    costUsd: number;
    promptTokens: number;
    completionTokens: number;
    requestCount: number;
  }>;
  periodStart: string | null;
  periodEnd: string | null;
}>('LlmCostSummary');

builder.objectType(LlmCostSummaryType, {
  fields: (t) => ({
    totalCostUsd: t.exposeFloat('totalCostUsd'),
    totalPromptTokens: t.exposeInt('totalPromptTokens'),
    totalCompletionTokens: t.exposeInt('totalCompletionTokens'),
    byProvider: t.field({
      type: [CostBreakdownEntryType],
      resolve: (parent) => parent.byProvider,
    }),
    byTaskType: t.field({
      type: [CostBreakdownEntryType],
      resolve: (parent) => parent.byTaskType,
    }),
    periodStart: t.exposeString('periodStart', { nullable: true }),
    periodEnd: t.exposeString('periodEnd', { nullable: true }),
  }),
});
