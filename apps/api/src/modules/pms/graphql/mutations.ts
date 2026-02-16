import { builder } from '../../../graphql/builder.js';
import {
  CreatePmsPlanResultType,
  UpdatePmsPlanResultType,
  ApprovePlanResultType,
  ActivatePlanResultType,
  VigilanceDbObjectType,
  ResponsibilityObjectType,
  PopulateGapRegistryResultType,
  GapRegistryEntryObjectType,
  CreateCycleResultType,
  CycleTransitionResultType,
  ActivityTransitionResultType,
  UpdateActivityResultType,
  ReassignActivityResultType,
  ComplaintObjectType,
  ImportComplaintsResultType,
  UpdateComplaintResultType,
  ComputeTrendsResultType,
  FinalizeTrendResultType,
  InstalledBaseEntryObjectType,
  GenerateReportResultType,
  CreateCerUpdateDecisionResultType,
  FinalizeDecisionResultType,
} from './types.js';
import {
  checkPermission,
  checkProjectMembership,
} from '../../../shared/middleware/rbac-middleware.js';
import { CreatePmsPlanUseCase } from '../application/use-cases/create-pms-plan.js';
import { UpdatePmsPlanUseCase } from '../application/use-cases/update-pms-plan.js';
import { ApprovePmsPlanUseCase } from '../application/use-cases/approve-pms-plan.js';
import { ActivatePmsPlanUseCase } from '../application/use-cases/activate-pms-plan.js';
import { ConfigureVigilanceDatabasesUseCase } from '../application/use-cases/configure-vigilance-databases.js';
import { ManageResponsibilitiesUseCase } from '../application/use-cases/manage-responsibilities.js';
import { PopulateGapRegistryUseCase } from '../application/use-cases/populate-gap-registry.js';
import { UpdateGapEntryUseCase } from '../application/use-cases/update-gap-entry.js';
import { CreateCycleUseCase } from '../application/use-cases/create-cycle.js';
import { ActivateCycleUseCase } from '../application/use-cases/activate-cycle.js';
import { CompleteCycleUseCase } from '../application/use-cases/complete-cycle.js';
import { ExecuteActivityUseCase } from '../application/use-cases/execute-activity.js';
import { CompleteActivityUseCase } from '../application/use-cases/complete-activity.js';
import { UpdateActivityUseCase } from '../application/use-cases/update-activity.js';
import { ReassignActivityUseCase } from '../application/use-cases/reassign-activity.js';
import { CreateComplaintUseCase } from '../application/use-cases/create-complaint.js';
import { UpdateComplaintUseCase } from '../application/use-cases/update-complaint.js';
import { ImportComplaintsUseCase } from '../application/use-cases/import-complaints.js';
import { ComputeTrendsUseCase } from '../application/use-cases/compute-trends.js';
import { FinalizeTrendAnalysisUseCase } from '../application/use-cases/finalize-trend-analysis.js';
import { ManageInstalledBaseUseCase } from '../application/use-cases/manage-installed-base.js';
import { GeneratePmcfReportUseCase } from '../application/use-cases/generate-pmcf-report.js';
import { GeneratePsurUseCase } from '../application/use-cases/generate-psur.js';
import { CreateCerUpdateDecisionUseCase } from '../application/use-cases/create-cer-update-decision.js';
import { FinalizeCerUpdateDecisionUseCase } from '../application/use-cases/finalize-cer-update-decision.js';
import { getEventBus } from '../../../shared/events/rabbitmq-event-bus.js';
import { getRedis } from '../../../config/redis.js';

// --- Story 6.1: PMS Plan ---

builder.mutationField('createPmsPlan', (t) =>
  t.field({
    type: CreatePmsPlanResultType,
    args: {
      projectId: t.arg.string({ required: true }),
      cerVersionId: t.arg.string({ required: true }),
      updateFrequency: t.arg.string({ required: true }),
      dataCollectionMethods: t.arg.stringList({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');
      await checkProjectMembership(ctx, args.projectId);

      const useCase = new CreatePmsPlanUseCase(ctx.prisma, getEventBus());
      return useCase.execute({
        projectId: args.projectId,
        cerVersionId: args.cerVersionId,
        updateFrequency: args.updateFrequency,
        dataCollectionMethods: args.dataCollectionMethods,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('updatePmsPlan', (t) =>
  t.field({
    type: UpdatePmsPlanResultType,
    args: {
      pmsPlanId: t.arg.string({ required: true }),
      updateFrequency: t.arg.string({ required: false }),
      dataCollectionMethods: t.arg.stringList({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new UpdatePmsPlanUseCase(ctx.prisma);
      return useCase.execute({
        pmsPlanId: args.pmsPlanId,
        updateFrequency: args.updateFrequency ?? undefined,
        dataCollectionMethods: args.dataCollectionMethods ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('approvePmsPlan', (t) =>
  t.field({
    type: ApprovePlanResultType,
    args: {
      pmsPlanId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new ApprovePmsPlanUseCase(ctx.prisma, getEventBus());
      return useCase.execute(args.pmsPlanId, ctx.user!.id) as any;
    },
  }),
);

builder.mutationField('activatePmsPlan', (t) =>
  t.field({
    type: ActivatePlanResultType,
    args: {
      pmsPlanId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new ActivatePmsPlanUseCase(ctx.prisma, getEventBus());
      return useCase.execute(args.pmsPlanId, ctx.user!.id) as any;
    },
  }),
);

builder.mutationField('configureVigilanceDatabases', (t) =>
  t.field({
    type: [VigilanceDbObjectType],
    args: {
      pmsPlanId: t.arg.string({ required: true }),
      databases: t.arg({ type: 'JSON', required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new ConfigureVigilanceDatabasesUseCase(ctx.prisma);
      return useCase.execute({
        pmsPlanId: args.pmsPlanId,
        databases: args.databases as any,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('addResponsibility', (t) =>
  t.field({
    type: ResponsibilityObjectType,
    args: {
      pmsPlanId: t.arg.string({ required: true }),
      activityType: t.arg.string({ required: true }),
      userId: t.arg.string({ required: true }),
      role: t.arg.string({ required: true }),
      description: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new ManageResponsibilitiesUseCase(ctx.prisma);
      return useCase.add({
        pmsPlanId: args.pmsPlanId,
        activityType: args.activityType,
        userId: args.userId,
        role: args.role,
        description: args.description ?? undefined,
        assignedBy: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('removeResponsibility', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      responsibilityId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new ManageResponsibilitiesUseCase(ctx.prisma);
      await useCase.remove(args.responsibilityId);
      return true;
    },
  }),
);

// --- Story 6.2: Gap Registry ---

builder.mutationField('populateGapRegistry', (t) =>
  t.field({
    type: PopulateGapRegistryResultType,
    args: {
      pmsPlanId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new PopulateGapRegistryUseCase(ctx.prisma);
      return useCase.execute(args.pmsPlanId, ctx.user!.id) as any;
    },
  }),
);

builder.mutationField('updateGapEntry', (t) =>
  t.field({
    type: GapRegistryEntryObjectType,
    args: {
      gapEntryId: t.arg.string({ required: true }),
      description: t.arg.string({ required: false }),
      severity: t.arg.string({ required: false }),
      recommendedActivity: t.arg.string({ required: false }),
      status: t.arg.string({ required: false }),
      resolutionNotes: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new UpdateGapEntryUseCase(ctx.prisma);
      return useCase.execute({
        gapEntryId: args.gapEntryId,
        description: args.description ?? undefined,
        severity: args.severity ?? undefined,
        recommendedActivity: args.recommendedActivity ?? undefined,
        status: args.status ?? undefined,
        resolutionNotes: args.resolutionNotes ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('addGapEntry', (t) =>
  t.field({
    type: GapRegistryEntryObjectType,
    args: {
      pmsPlanId: t.arg.string({ required: true }),
      description: t.arg.string({ required: true }),
      severity: t.arg.string({ required: true }),
      recommendedActivity: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new UpdateGapEntryUseCase(ctx.prisma);
      return useCase.addManual({
        pmsPlanId: args.pmsPlanId,
        description: args.description,
        severity: args.severity,
        recommendedActivity: args.recommendedActivity,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Story 6.3: PMS Cycle ---

builder.mutationField('createPmsCycle', (t) =>
  t.field({
    type: CreateCycleResultType,
    args: {
      pmsPlanId: t.arg.string({ required: true }),
      cerVersionId: t.arg.string({ required: true }),
      name: t.arg.string({ required: true }),
      startDate: t.arg.string({ required: true }),
      endDate: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new CreateCycleUseCase(ctx.prisma, getEventBus());
      return useCase.execute({
        pmsPlanId: args.pmsPlanId,
        cerVersionId: args.cerVersionId,
        name: args.name,
        startDate: args.startDate,
        endDate: args.endDate,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('activatePmsCycle', (t) =>
  t.field({
    type: CycleTransitionResultType,
    args: {
      cycleId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new ActivateCycleUseCase(ctx.prisma, getEventBus());
      return useCase.execute(args.cycleId, ctx.user!.id) as any;
    },
  }),
);

builder.mutationField('completePmsCycle', (t) =>
  t.field({
    type: CycleTransitionResultType,
    args: {
      cycleId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new CompleteCycleUseCase(ctx.prisma, getEventBus());
      return useCase.execute(args.cycleId, ctx.user!.id) as any;
    },
  }),
);

// --- Story 6.4: PMCF Activities ---

builder.mutationField('startPmcfActivity', (t) =>
  t.field({
    type: ActivityTransitionResultType,
    args: {
      activityId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new ExecuteActivityUseCase(ctx.prisma, getEventBus());
      return useCase.execute(args.activityId, ctx.user!.id) as any;
    },
  }),
);

builder.mutationField('completePmcfActivity', (t) =>
  t.field({
    type: ActivityTransitionResultType,
    args: {
      activityId: t.arg.string({ required: true }),
      findingsSummary: t.arg.string({ required: true }),
      conclusions: t.arg.string({ required: true }),
      dataCollected: t.arg({ type: 'JSON', required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new CompleteActivityUseCase(ctx.prisma, getEventBus());
      return useCase.execute({
        activityId: args.activityId,
        findingsSummary: args.findingsSummary,
        conclusions: args.conclusions,
        dataCollected: (args.dataCollected as Record<string, unknown>) ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('updatePmcfActivity', (t) =>
  t.field({
    type: UpdateActivityResultType,
    args: {
      activityId: t.arg.string({ required: true }),
      title: t.arg.string({ required: false }),
      description: t.arg.string({ required: false }),
      findingsSummary: t.arg.string({ required: false }),
      conclusions: t.arg.string({ required: false }),
      dataCollected: t.arg({ type: 'JSON', required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new UpdateActivityUseCase(ctx.prisma);
      return useCase.execute({
        activityId: args.activityId,
        title: args.title ?? undefined,
        description: args.description ?? undefined,
        findingsSummary: args.findingsSummary ?? undefined,
        conclusions: args.conclusions ?? undefined,
        dataCollected: (args.dataCollected as Record<string, unknown>) ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('reassignPmcfActivity', (t) =>
  t.field({
    type: ReassignActivityResultType,
    args: {
      activityId: t.arg.string({ required: true }),
      newAssigneeId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new ReassignActivityUseCase(ctx.prisma);
      return useCase.execute(args.activityId, args.newAssigneeId, ctx.user!.id) as any;
    },
  }),
);

// --- Story 6.5: Complaints ---

builder.mutationField('createComplaint', (t) =>
  t.field({
    type: ComplaintObjectType,
    args: {
      pmsCycleId: t.arg.string({ required: true }),
      date: t.arg.string({ required: true }),
      reportDate: t.arg.string({ required: true }),
      description: t.arg.string({ required: true }),
      deviceIdentifier: t.arg.string({ required: true }),
      severity: t.arg.string({ required: true }),
      classification: t.arg.string({ required: true }),
      lotNumber: t.arg.string({ required: false }),
      serialNumber: t.arg.string({ required: false }),
      classificationDescription: t.arg.string({ required: false }),
      isIncident: t.arg.boolean({ required: false }),
      regulatoryReportRequired: t.arg.boolean({ required: false }),
      harmSeverity: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new CreateComplaintUseCase(ctx.prisma);
      return useCase.execute({
        pmsCycleId: args.pmsCycleId,
        date: args.date,
        reportDate: args.reportDate,
        description: args.description,
        deviceIdentifier: args.deviceIdentifier,
        severity: args.severity,
        classification: args.classification,
        lotNumber: args.lotNumber ?? undefined,
        serialNumber: args.serialNumber ?? undefined,
        classificationDescription: args.classificationDescription ?? undefined,
        isIncident: args.isIncident ?? undefined,
        regulatoryReportRequired: args.regulatoryReportRequired ?? undefined,
        harmSeverity: args.harmSeverity ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('updateComplaint', (t) =>
  t.field({
    type: UpdateComplaintResultType,
    args: {
      complaintId: t.arg.string({ required: true }),
      description: t.arg.string({ required: false }),
      severity: t.arg.string({ required: false }),
      classification: t.arg.string({ required: false }),
      status: t.arg.string({ required: false }),
      resolution: t.arg.string({ required: false }),
      correctiveAction: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new UpdateComplaintUseCase(ctx.prisma);
      return useCase.execute({
        complaintId: args.complaintId,
        description: args.description ?? undefined,
        severity: args.severity ?? undefined,
        classification: args.classification ?? undefined,
        status: args.status ?? undefined,
        resolution: args.resolution ?? undefined,
        correctiveAction: args.correctiveAction ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('importComplaints', (t) =>
  t.field({
    type: ImportComplaintsResultType,
    args: {
      pmsCycleId: t.arg.string({ required: true }),
      complaints: t.arg({ type: 'JSON', required: true }),
      source: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new ImportComplaintsUseCase(ctx.prisma, getEventBus());
      return useCase.execute({
        pmsCycleId: args.pmsCycleId,
        complaints: args.complaints as any,
        source: args.source,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Story 6.6: Trend Analysis ---

builder.mutationField('computeTrendAnalysis', (t) =>
  t.field({
    type: ComputeTrendsResultType,
    args: {
      pmsCycleId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new ComputeTrendsUseCase(ctx.prisma);
      return useCase.execute(args.pmsCycleId, ctx.user!.id) as any;
    },
  }),
);

builder.mutationField('finalizeTrendAnalysis', (t) =>
  t.field({
    type: FinalizeTrendResultType,
    args: {
      trendAnalysisId: t.arg.string({ required: true }),
      conclusions: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new FinalizeTrendAnalysisUseCase(ctx.prisma);
      return useCase.execute(args.trendAnalysisId, args.conclusions, ctx.user!.id) as any;
    },
  }),
);

builder.mutationField('createInstalledBaseEntry', (t) =>
  t.field({
    type: InstalledBaseEntryObjectType,
    args: {
      pmsCycleId: t.arg.string({ required: true }),
      periodStart: t.arg.string({ required: true }),
      periodEnd: t.arg.string({ required: true }),
      totalUnitsShipped: t.arg.int({ required: true }),
      activeDevices: t.arg.int({ required: true }),
      regionBreakdown: t.arg({ type: 'JSON', required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new ManageInstalledBaseUseCase(ctx.prisma);
      return useCase.create({
        pmsCycleId: args.pmsCycleId,
        periodStart: args.periodStart,
        periodEnd: args.periodEnd,
        totalUnitsShipped: args.totalUnitsShipped,
        activeDevices: args.activeDevices,
        regionBreakdown: (args.regionBreakdown as Record<string, number>) ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('deleteInstalledBaseEntry', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      entryId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new ManageInstalledBaseUseCase(ctx.prisma);
      await useCase.delete(args.entryId);
      return true;
    },
  }),
);

// --- Story 6.7: PMCF Report ---

builder.mutationField('generatePmcfReport', (t) =>
  t.field({
    type: GenerateReportResultType,
    args: {
      pmsCycleId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const redis = getRedis();
      const taskService = {
        enqueueTask: async (
          type: string,
          data: Record<string, unknown> | undefined,
          userId: string,
        ) => {
          const taskId = crypto.randomUUID();
          await redis.publish(
            'task:enqueued',
            JSON.stringify({ taskId, type, data, createdBy: userId }),
          );
          return { id: taskId };
        },
      };

      const useCase = new GeneratePmcfReportUseCase(ctx.prisma, taskService);
      return useCase.execute(args.pmsCycleId, ctx.user!.id) as any;
    },
  }),
);

// --- Story 6.8: PSUR ---

builder.mutationField('generatePsur', (t) =>
  t.field({
    type: GenerateReportResultType,
    args: {
      pmsCycleId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const redis = getRedis();
      const taskService = {
        enqueueTask: async (
          type: string,
          data: Record<string, unknown> | undefined,
          userId: string,
        ) => {
          const taskId = crypto.randomUUID();
          await redis.publish(
            'task:enqueued',
            JSON.stringify({ taskId, type, data, createdBy: userId }),
          );
          return { id: taskId };
        },
      };

      const useCase = new GeneratePsurUseCase(ctx.prisma, taskService);
      return useCase.execute(args.pmsCycleId, ctx.user!.id) as any;
    },
  }),
);

// --- Story 6.9: CER Update Decision ---

builder.mutationField('createCerUpdateDecision', (t) =>
  t.field({
    type: CreateCerUpdateDecisionResultType,
    args: {
      pmsCycleId: t.arg.string({ required: true }),
      benefitRiskReAssessment: t.arg.string({ required: true }),
      conclusion: t.arg.string({ required: true }),
      justification: t.arg.string({ required: true }),
      materialChangesIdentified: t.arg.boolean({ required: true }),
      materialChangesDescription: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new CreateCerUpdateDecisionUseCase(ctx.prisma);
      return useCase.execute({
        pmsCycleId: args.pmsCycleId,
        benefitRiskReAssessment: args.benefitRiskReAssessment,
        conclusion: args.conclusion,
        justification: args.justification,
        materialChangesIdentified: args.materialChangesIdentified,
        materialChangesDescription: args.materialChangesDescription ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('finalizeCerUpdateDecision', (t) =>
  t.field({
    type: FinalizeDecisionResultType,
    args: {
      decisionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'pms', 'write');

      const useCase = new FinalizeCerUpdateDecisionUseCase(ctx.prisma, getEventBus());
      return useCase.execute({ decisionId: args.decisionId, userId: ctx.user!.id }) as any;
    },
  }),
);
