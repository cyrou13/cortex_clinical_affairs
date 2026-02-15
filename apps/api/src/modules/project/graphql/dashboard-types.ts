import { builder } from '../../../graphql/builder.js';
import { CepType } from './types.js';
import type { ModuleStatusInfo } from '../application/use-cases/get-pipeline-status.js';
import type { ProjectMetrics } from '../application/use-cases/get-project-metrics.js';
import type { ActivityEntry } from '../application/use-cases/get-recent-activity.js';
import type { Milestone } from '../application/use-cases/get-project-timeline.js';

// --- ModuleStatusInfoType ---

export const ModuleStatusInfoType = builder.objectRef<ModuleStatusInfo>('ModuleStatusInfo');

builder.objectType(ModuleStatusInfoType, {
  fields: (t) => ({
    status: t.exposeString('status'),
    itemCount: t.exposeInt('itemCount'),
    lockedCount: t.exposeInt('lockedCount'),
    blockedReason: t.exposeString('blockedReason', { nullable: true }),
  }),
});

// --- PipelineStatusDetailedType ---

export const PipelineStatusDetailedType = builder.objectRef<{
  sls: ModuleStatusInfo;
  soa: ModuleStatusInfo;
  validation: ModuleStatusInfo;
  cer: ModuleStatusInfo;
  pms: ModuleStatusInfo;
}>('PipelineStatusDetailed');

builder.objectType(PipelineStatusDetailedType, {
  fields: (t) => ({
    sls: t.field({ type: ModuleStatusInfoType, resolve: (parent) => parent.sls }),
    soa: t.field({ type: ModuleStatusInfoType, resolve: (parent) => parent.soa }),
    validation: t.field({ type: ModuleStatusInfoType, resolve: (parent) => parent.validation }),
    cer: t.field({ type: ModuleStatusInfoType, resolve: (parent) => parent.cer }),
    pms: t.field({ type: ModuleStatusInfoType, resolve: (parent) => parent.pms }),
  }),
});

// --- ProjectMetricsType ---

export const ProjectMetricsType = builder.objectRef<ProjectMetrics>('ProjectMetrics');

builder.objectType(ProjectMetricsType, {
  fields: (t) => ({
    totalArticles: t.exposeInt('totalArticles'),
    includedArticles: t.exposeInt('includedArticles'),
    soaSectionsComplete: t.exposeInt('soaSectionsComplete'),
    soaSectionsTotal: t.exposeInt('soaSectionsTotal'),
    cerSectionsComplete: t.exposeInt('cerSectionsComplete'),
    cerSectionsTotal: t.exposeInt('cerSectionsTotal'),
    traceabilityCoverage: t.exposeFloat('traceabilityCoverage'),
    teamMemberCount: t.exposeInt('teamMemberCount'),
    lastActivityAt: t.exposeString('lastActivityAt', { nullable: true }),
  }),
});

// --- ActivityEntryType ---

export const ActivityEntryType = builder.objectRef<ActivityEntry>('ActivityEntry');

builder.objectType(ActivityEntryType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    action: t.exposeString('action'),
    description: t.exposeString('description'),
    userId: t.exposeString('userId'),
    userName: t.exposeString('userName'),
    timestamp: t.exposeString('timestamp'),
    targetType: t.exposeString('targetType'),
    targetId: t.exposeString('targetId'),
  }),
});

// --- MilestoneType ---

export const MilestoneType = builder.objectRef<Milestone>('Milestone');

builder.objectType(MilestoneType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    name: t.exposeString('name'),
    module: t.exposeString('module'),
    status: t.exposeString('status'),
    targetDate: t.exposeString('targetDate', { nullable: true }),
    completedDate: t.exposeString('completedDate', { nullable: true }),
    order: t.exposeInt('order'),
  }),
});

// --- EnrichedDashboardType ---

interface EnrichedDashboardShape {
  id: string;
  name: string;
  deviceName: string;
  deviceClass: string;
  regulatoryContext: string;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  cep: {
    id: string;
    projectId: string;
    scope: string | null;
    objectives: string | null;
    deviceClassification: string | null;
    clinicalBackground: string | null;
    searchStrategy: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  members: unknown[];
  pipelineStatusDetailed: {
    sls: ModuleStatusInfo;
    soa: ModuleStatusInfo;
    validation: ModuleStatusInfo;
    cer: ModuleStatusInfo;
    pms: ModuleStatusInfo;
  };
  metrics: ProjectMetrics;
  recentActivities: ActivityEntry[];
  milestones: Milestone[];
}

export const EnrichedDashboardType = builder.objectRef<EnrichedDashboardShape>('EnrichedDashboard');

builder.objectType(EnrichedDashboardType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    name: t.exposeString('name'),
    deviceName: t.exposeString('deviceName'),
    deviceClass: t.exposeString('deviceClass'),
    regulatoryContext: t.exposeString('regulatoryContext'),
    status: t.exposeString('status'),
    createdBy: t.exposeString('createdBy'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    cep: t.field({
      type: CepType,
      nullable: true,
      resolve: (parent) => parent.cep ?? null,
    }),
    members: t.field({
      type: ['JSON'],
      resolve: (parent) => parent.members,
    }),
    pipelineStatusDetailed: t.field({
      type: PipelineStatusDetailedType,
      resolve: (parent) => parent.pipelineStatusDetailed,
    }),
    metrics: t.field({
      type: ProjectMetricsType,
      resolve: (parent) => parent.metrics,
    }),
    recentActivities: t.field({
      type: [ActivityEntryType],
      resolve: (parent) => parent.recentActivities,
    }),
    milestones: t.field({
      type: [MilestoneType],
      resolve: (parent) => parent.milestones,
    }),
  }),
});
