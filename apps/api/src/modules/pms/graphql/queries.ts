import { builder } from '../../../graphql/builder.js';
import {
  PmsPlanObjectType,
  VigilanceDbObjectType,
  ResponsibilityObjectType,
  GapRegistryEntryObjectType,
  PmsCycleObjectType,
  PmcfActivityObjectType,
  ComplaintObjectType,
  TrendAnalysisObjectType,
  InstalledBaseEntryObjectType,
  CerUpdateDecisionObjectType,
} from './types.js';
import { checkPermission, checkProjectMembership } from '../../../shared/middleware/rbac-middleware.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import { ManageResponsibilitiesUseCase } from '../application/use-cases/manage-responsibilities.js';
import { ManageInstalledBaseUseCase } from '../application/use-cases/manage-installed-base.js';

// --- Story 6.1: PMS Plans ---

builder.queryField('pmsPlans', (t) =>
  t.field({
    type: [PmsPlanObjectType],
    args: {
      projectId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'read');
      await checkProjectMembership(ctx, args.projectId);

      const plans = await (ctx.prisma as any).pmsPlan.findMany({
        where: { projectId: args.projectId },
        orderBy: { createdAt: 'desc' },
      });

      return plans as any;
    },
  }),
);

builder.queryField('pmsPlan', (t) =>
  t.field({
    type: PmsPlanObjectType,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'read');

      const plan = await (ctx.prisma as any).pmsPlan.findUnique({
        where: { id: args.id },
      });

      if (!plan) {
        throw new NotFoundError('PmsPlan', args.id);
      }

      await checkProjectMembership(ctx, plan.projectId);

      return plan as any;
    },
  }),
);

builder.queryField('vigilanceDatabases', (t) =>
  t.field({
    type: [VigilanceDbObjectType],
    args: {
      pmsPlanId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'read');

      const dbs = await (ctx.prisma as any).pmsPlanVigilanceDb.findMany({
        where: { pmsPlanId: args.pmsPlanId },
      });

      return dbs as any;
    },
  }),
);

builder.queryField('pmsResponsibilities', (t) =>
  t.field({
    type: [ResponsibilityObjectType],
    args: {
      pmsPlanId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'read');

      const useCase = new ManageResponsibilitiesUseCase(ctx.prisma);
      return useCase.list(args.pmsPlanId) as any;
    },
  }),
);

// --- Story 6.2: Gap Registry ---

builder.queryField('gapRegistryEntries', (t) =>
  t.field({
    type: [GapRegistryEntryObjectType],
    args: {
      pmsPlanId: t.arg.string({ required: true }),
      status: t.arg.string({ required: false }),
      severity: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'read');

      const where: Record<string, unknown> = { pmsPlanId: args.pmsPlanId };
      if (args.status) where.status = args.status;
      if (args.severity) where.severity = args.severity;

      const entries = await (ctx.prisma as any).gapRegistryEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return entries as any;
    },
  }),
);

// --- Story 6.3: PMS Cycles ---

builder.queryField('pmsCycles', (t) =>
  t.field({
    type: [PmsCycleObjectType],
    args: {
      pmsPlanId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'read');

      const cycles = await (ctx.prisma as any).pmsCycle.findMany({
        where: { pmsPlanId: args.pmsPlanId },
        orderBy: { startDate: 'desc' },
      });

      return cycles as any;
    },
  }),
);

builder.queryField('pmsCycle', (t) =>
  t.field({
    type: PmsCycleObjectType,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'read');

      const cycle = await (ctx.prisma as any).pmsCycle.findUnique({
        where: { id: args.id },
      });

      if (!cycle) {
        throw new NotFoundError('PmsCycle', args.id);
      }

      return cycle as any;
    },
  }),
);

// --- Story 6.4: PMCF Activities ---

builder.queryField('pmcfActivities', (t) =>
  t.field({
    type: [PmcfActivityObjectType],
    args: {
      cycleId: t.arg.string({ required: true }),
      status: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'read');

      const where: Record<string, unknown> = { pmsCycleId: args.cycleId };
      if (args.status) where.status = args.status;

      const activities = await (ctx.prisma as any).pmcfActivity.findMany({
        where,
        orderBy: { activityType: 'asc' },
      });

      return activities as any;
    },
  }),
);

builder.queryField('pmcfActivity', (t) =>
  t.field({
    type: PmcfActivityObjectType,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'read');

      const activity = await (ctx.prisma as any).pmcfActivity.findUnique({
        where: { id: args.id },
      });

      if (!activity) {
        throw new NotFoundError('PmcfActivity', args.id);
      }

      return activity as any;
    },
  }),
);

// --- Story 6.5: Complaints ---

builder.queryField('complaints', (t) =>
  t.field({
    type: [ComplaintObjectType],
    args: {
      cycleId: t.arg.string({ required: true }),
      severity: t.arg.string({ required: false }),
      status: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'read');

      const where: Record<string, unknown> = { pmsCycleId: args.cycleId };
      if (args.severity) where.severity = args.severity;
      if (args.status) where.status = args.status;

      const complaints = await (ctx.prisma as any).complaint.findMany({
        where,
        orderBy: { date: 'desc' },
      });

      return complaints as any;
    },
  }),
);

builder.queryField('complaint', (t) =>
  t.field({
    type: ComplaintObjectType,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'read');

      const complaint = await (ctx.prisma as any).complaint.findUnique({
        where: { id: args.id },
      });

      if (!complaint) {
        throw new NotFoundError('Complaint', args.id);
      }

      return complaint as any;
    },
  }),
);

// --- Story 6.6: Trend Analysis ---

builder.queryField('trendAnalyses', (t) =>
  t.field({
    type: [TrendAnalysisObjectType],
    args: {
      cycleId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'read');

      const analyses = await (ctx.prisma as any).trendAnalysis.findMany({
        where: { pmsCycleId: args.cycleId },
        orderBy: { analysisDate: 'desc' },
      });

      return analyses as any;
    },
  }),
);

builder.queryField('installedBaseEntries', (t) =>
  t.field({
    type: [InstalledBaseEntryObjectType],
    args: {
      cycleId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'read');

      const useCase = new ManageInstalledBaseUseCase(ctx.prisma);
      return useCase.list(args.cycleId) as any;
    },
  }),
);

// --- Story 6.9: CER Update Decision ---

builder.queryField('cerUpdateDecision', (t) =>
  t.field({
    type: CerUpdateDecisionObjectType,
    nullable: true,
    args: {
      cycleId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'read');

      const decision = await (ctx.prisma as any).cerUpdateDecision.findFirst({
        where: { pmsCycleId: args.cycleId },
        orderBy: { createdAt: 'desc' },
      });

      return decision as any;
    },
  }),
);

builder.queryField('cerUpdateDecisions', (t) =>
  t.field({
    type: [CerUpdateDecisionObjectType],
    args: {
      projectId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'read');
      await checkProjectMembership(ctx, args.projectId);

      const plans = await (ctx.prisma as any).pmsPlan.findMany({
        where: { projectId: args.projectId },
        select: { id: true },
      });

      const planIds = plans.map((p: { id: string }) => p.id);

      const cycles = await (ctx.prisma as any).pmsCycle.findMany({
        where: { pmsPlanId: { in: planIds } },
        select: { id: true },
      });

      const cycleIds = cycles.map((c: { id: string }) => c.id);

      const decisions = await (ctx.prisma as any).cerUpdateDecision.findMany({
        where: { pmsCycleId: { in: cycleIds } },
        orderBy: { createdAt: 'desc' },
      });

      return decisions as any;
    },
  }),
);
