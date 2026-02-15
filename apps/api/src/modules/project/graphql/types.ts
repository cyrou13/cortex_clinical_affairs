import { builder } from '../../../graphql/builder.js';
import { ProjectMemberType } from '../../auth/graphql/types.js';

export const CepType = builder.objectRef<{
  id: string;
  projectId: string;
  scope: string | null;
  objectives: string | null;
  deviceClassification: string | null;
  clinicalBackground: string | null;
  searchStrategy: string | null;
  createdAt: Date;
  updatedAt: Date;
}>('Cep');

builder.objectType(CepType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    projectId: t.exposeString('projectId'),
    scope: t.exposeString('scope', { nullable: true }),
    objectives: t.exposeString('objectives', { nullable: true }),
    deviceClassification: t.exposeString('deviceClassification', { nullable: true }),
    clinicalBackground: t.exposeString('clinicalBackground', { nullable: true }),
    searchStrategy: t.exposeString('searchStrategy', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

export const PipelineStatusType = builder.objectRef<{
  sls: string;
  soa: string;
  validation: string;
  cer: string;
  pms: string;
}>('PipelineStatus');

builder.objectType(PipelineStatusType, {
  fields: (t) => ({
    sls: t.exposeString('sls'),
    soa: t.exposeString('soa'),
    validation: t.exposeString('validation'),
    cer: t.exposeString('cer'),
    pms: t.exposeString('pms'),
  }),
});

export const ProjectType = builder.objectRef<{
  id: string;
  name: string;
  deviceName: string;
  deviceClass: string;
  regulatoryContext: string;
  status: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  cep?: {
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
  members?: Array<{
    id: string;
    projectId: string;
    userId: string;
    role: string;
    createdAt: Date;
    user?: { id: string; email: string; name: string; avatarUrl: string | null; role: string; isActive: boolean; mfaEnabled: boolean; lastLoginAt: Date | null; createdAt: Date };
  }>;
}>('Project');

builder.objectType(ProjectType, {
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
      type: [ProjectMemberType],
      nullable: true,
      resolve: (parent) => parent.members ?? null,
    }),
  }),
});

export const ProjectDashboardType = builder.objectRef<{
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
  members: Array<{
    id: string;
    projectId: string;
    userId: string;
    role: string;
    createdAt: Date;
    user?: { id: string; email: string; name: string; avatarUrl: string | null; role: string; isActive: boolean; mfaEnabled: boolean; lastLoginAt: Date | null; createdAt: Date };
  }>;
  pipelineStatus: { sls: string; soa: string; validation: string; cer: string; pms: string };
  recentActivity: Array<{
    id: string;
    action: string;
    userId: string;
    timestamp: Date;
    metadata: unknown;
  }>;
}>('ProjectDashboard');

builder.objectType(ProjectDashboardType, {
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
      type: [ProjectMemberType],
      resolve: (parent) => parent.members,
    }),
    pipelineStatus: t.field({
      type: PipelineStatusType,
      resolve: (parent) => parent.pipelineStatus,
    }),
    recentActivity: t.field({
      type: ['JSON'],
      resolve: (parent) => parent.recentActivity,
    }),
  }),
});
