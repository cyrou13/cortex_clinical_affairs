import { builder } from '../../../graphql/builder.js';
import {
  CreateCerResultType,
  LinkUpstreamResultType,
  CerExternalDocumentObjectType,
  UpdateExternalDocVersionResultType,
  NamedDeviceSearchResultType,
  AssembleSectionsResultType,
  ReviewSectionResultType,
  SaveSectionContentResultType,
  GenerateGsprResultType,
  ComplianceStatementResultType,
  UpdateGsprRowResultType,
  BenefitRiskResultType,
  UpdateBenefitRiskResultType,
  BibliographyResultType,
  EvaluatorObjectType,
  ESignResultType,
  CreateVersionResultType,
  ExportCerResultType,
  LockCerResultType,
} from './types.js';
import {
  checkPermission,
  checkProjectMembership,
} from '../../../shared/middleware/rbac-middleware.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import { CreateCerUseCase } from '../application/use-cases/create-cer.js';
import { LinkUpstreamUseCase } from '../application/use-cases/link-upstream.js';
import { ManageExternalDocsUseCase } from '../application/use-cases/manage-external-docs.js';
import { UpdateExternalDocVersionUseCase } from '../application/use-cases/update-external-doc-version.js';
import { CreateNamedDeviceSearchUseCase } from '../application/use-cases/create-named-device-search.js';
import { AssembleSectionsUseCase } from '../application/use-cases/assemble-sections.js';
import { ReviewSectionUseCase } from '../application/use-cases/review-section.js';
import { SaveSectionContentUseCase } from '../application/use-cases/save-section-content.js';
import { GenerateGsprUseCase } from '../application/use-cases/generate-gspr.js';
import { GenerateComplianceStatementUseCase } from '../application/use-cases/generate-compliance-statement.js';
import { UpdateGsprRowUseCase } from '../application/use-cases/update-gspr-row.js';
import { DetermineBenefitRiskUseCase } from '../application/use-cases/determine-benefit-risk.js';
import { UpdateBenefitRiskUseCase } from '../application/use-cases/update-benefit-risk.js';
import { ManageBibliographyUseCase } from '../application/use-cases/manage-bibliography.js';
import { ManageEvaluatorsUseCase } from '../application/use-cases/manage-evaluators.js';
import { ESignDocumentUseCase } from '../application/use-cases/e-sign-document.js';
import { ManageVersionsUseCase } from '../application/use-cases/manage-versions.js';
import { ExportCerUseCase } from '../application/use-cases/export-cer.js';
import { LockCerUseCase } from '../application/use-cases/lock-cer.js';
import { getEventBus } from '../../../shared/events/rabbitmq-event-bus.js';
import { getRedis } from '../../../config/redis.js';

// --- Story 5.1: CER Creation & Upstream Linking ---

builder.mutationField('createCer', (t) =>
  t.field({
    type: CreateCerResultType,
    args: {
      projectId: t.arg.string({ required: true }),
      regulatoryContext: t.arg.string({ required: true }),
      versionType: t.arg.string({ required: true }),
      currentVersion: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');
      await checkProjectMembership(ctx, args.projectId);

      const useCase = new CreateCerUseCase(ctx.prisma, getEventBus());
      return useCase.execute({
        projectId: args.projectId,
        regulatoryContext: args.regulatoryContext,
        versionType: args.versionType,
        currentVersion: args.currentVersion ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('linkCerUpstream', (t) =>
  t.field({
    type: LinkUpstreamResultType,
    args: {
      cerVersionId: t.arg.string({ required: true }),
      moduleType: t.arg.string({ required: true }),
      moduleId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      // Verify project membership via cerVersion
      const cer = await ctx.prisma.cerVersion.findUnique({
        where: { id: args.cerVersionId },
      });
      if (!cer) throw new NotFoundError('CerVersion', args.cerVersionId);
      await checkProjectMembership(ctx, cer.projectId);

      const useCase = new LinkUpstreamUseCase(ctx.prisma);
      return useCase.execute({
        cerVersionId: args.cerVersionId,
        moduleType: args.moduleType,
        moduleId: args.moduleId,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Story 5.2: External Documents ---

builder.mutationField('createCerExternalDoc', (t) =>
  t.field({
    type: CerExternalDocumentObjectType,
    args: {
      cerVersionId: t.arg.string({ required: true }),
      title: t.arg.string({ required: true }),
      version: t.arg.string({ required: true }),
      date: t.arg.string({ required: true }),
      summary: t.arg.string({ required: true }),
      documentType: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const useCase = new ManageExternalDocsUseCase(ctx.prisma);
      return useCase.create({ ...args, userId: ctx.user!.id }) as any;
    },
  }),
);

builder.mutationField('updateCerExternalDoc', (t) =>
  t.field({
    type: CerExternalDocumentObjectType,
    args: {
      documentId: t.arg.string({ required: true }),
      title: t.arg.string({ required: false }),
      version: t.arg.string({ required: false }),
      date: t.arg.string({ required: false }),
      summary: t.arg.string({ required: false }),
      documentType: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const useCase = new ManageExternalDocsUseCase(ctx.prisma);
      return useCase.update({
        documentId: args.documentId,
        title: args.title ?? undefined,
        version: args.version ?? undefined,
        date: args.date ?? undefined,
        summary: args.summary ?? undefined,
        documentType: args.documentType ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('deleteCerExternalDoc', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      documentId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const useCase = new ManageExternalDocsUseCase(ctx.prisma);
      await useCase.delete({ documentId: args.documentId, userId: ctx.user!.id });
      return true;
    },
  }),
);

builder.mutationField('updateExternalDocVersion', (t) =>
  t.field({
    type: UpdateExternalDocVersionResultType,
    args: {
      documentId: t.arg.string({ required: true }),
      newVersion: t.arg.string({ required: true }),
      newDate: t.arg.string({ required: true }),
      newSummary: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const useCase = new UpdateExternalDocVersionUseCase(ctx.prisma, getEventBus());
      return useCase.execute({
        documentId: args.documentId,
        newVersion: args.newVersion,
        newDate: args.newDate,
        newSummary: args.newSummary ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Story 5.3: Named Device Search ---

builder.mutationField('createNamedDeviceSearch', (t) =>
  t.field({
    type: NamedDeviceSearchResultType,
    args: {
      cerVersionId: t.arg.string({ required: true }),
      deviceName: t.arg.string({ required: true }),
      keywords: t.arg.stringList({ required: true }),
      databases: t.arg.stringList({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const useCase = new CreateNamedDeviceSearchUseCase(ctx.prisma);
      return useCase.execute({
        cerVersionId: args.cerVersionId,
        deviceName: args.deviceName,
        keywords: args.keywords,
        databases: args.databases,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Story 5.4: Section Assembly ---

builder.mutationField('assembleCerSections', (t) =>
  t.field({
    type: AssembleSectionsResultType,
    args: {
      cerVersionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const redis = getRedis();
      const jobEnqueuer = {
        enqueue: async (
          queueName: string,
          jobData: {
            taskId: string;
            type: string;
            metadata: Record<string, unknown>;
            createdBy: string;
          },
        ) => {
          await redis.publish('task:enqueued', JSON.stringify({ ...jobData, queue: queueName }));
          return jobData.taskId;
        },
      };

      const useCase = new AssembleSectionsUseCase(ctx.prisma, jobEnqueuer);
      return useCase.execute({
        cerVersionId: args.cerVersionId,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Story 5.5: Section Review ---

builder.mutationField('reviewCerSection', (t) =>
  t.field({
    type: ReviewSectionResultType,
    args: {
      cerSectionId: t.arg.string({ required: true }),
      content: t.arg({ type: 'JSON', required: true }),
      targetStatus: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const useCase = new ReviewSectionUseCase(ctx.prisma, getEventBus());
      return useCase.execute({
        cerSectionId: args.cerSectionId,
        content: args.content as Record<string, unknown>,
        targetStatus: args.targetStatus as 'DRAFT' | 'REVIEWED' | 'FINALIZED',
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('saveCerSectionContent', (t) =>
  t.field({
    type: SaveSectionContentResultType,
    args: {
      cerSectionId: t.arg.string({ required: true }),
      content: t.arg({ type: 'JSON', required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const useCase = new SaveSectionContentUseCase(ctx.prisma);
      return useCase.execute({
        cerSectionId: args.cerSectionId,
        content: args.content as Record<string, unknown>,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Story 5.7: GSPR ---

builder.mutationField('generateGspr', (t) =>
  t.field({
    type: GenerateGsprResultType,
    args: {
      cerVersionId: t.arg.string({ required: true }),
      deviceClass: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const useCase = new GenerateGsprUseCase(ctx.prisma);
      return useCase.execute({
        cerVersionId: args.cerVersionId,
        deviceClass: args.deviceClass as 'I' | 'IIa' | 'IIb' | 'III',
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('generateComplianceStatement', (t) =>
  t.field({
    type: ComplianceStatementResultType,
    args: {
      cerVersionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const useCase = new GenerateComplianceStatementUseCase(ctx.prisma);
      return useCase.execute({
        cerVersionId: args.cerVersionId,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('updateGsprRow', (t) =>
  t.field({
    type: UpdateGsprRowResultType,
    args: {
      gsprMatrixRowId: t.arg.string({ required: true }),
      status: t.arg.string({ required: false }),
      evidenceReferences: t.arg.stringList({ required: false }),
      notes: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const useCase = new UpdateGsprRowUseCase(ctx.prisma);
      return useCase.execute({
        gsprMatrixRowId: args.gsprMatrixRowId,
        status: args.status as any,
        evidenceReferences: args.evidenceReferences ?? undefined,
        notes: args.notes ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Story 5.8: Benefit-Risk ---

builder.mutationField('determineBenefitRisk', (t) =>
  t.field({
    type: BenefitRiskResultType,
    args: {
      cerVersionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const useCase = new DetermineBenefitRiskUseCase(ctx.prisma);
      return useCase.execute({
        cerVersionId: args.cerVersionId,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('updateBenefit', (t) =>
  t.field({
    type: UpdateBenefitRiskResultType,
    args: {
      benefitRiskItemId: t.arg.string({ required: true }),
      description: t.arg.string({ required: false }),
      evidenceLinks: t.arg.stringList({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const useCase = new UpdateBenefitRiskUseCase(ctx.prisma);
      return useCase.updateBenefit({
        benefitRiskItemId: args.benefitRiskItemId,
        description: args.description ?? undefined,
        evidenceLinks: args.evidenceLinks ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('updateRisk', (t) =>
  t.field({
    type: UpdateBenefitRiskResultType,
    args: {
      benefitRiskItemId: t.arg.string({ required: true }),
      description: t.arg.string({ required: false }),
      severity: t.arg.string({ required: false }),
      probability: t.arg.string({ required: false }),
      evidenceLinks: t.arg.stringList({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const useCase = new UpdateBenefitRiskUseCase(ctx.prisma);
      return useCase.updateRisk({
        benefitRiskItemId: args.benefitRiskItemId,
        description: args.description ?? undefined,
        severity: args.severity as any,
        probability: args.probability as any,
        evidenceLinks: args.evidenceLinks ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('updateMitigation', (t) =>
  t.field({
    type: UpdateBenefitRiskResultType,
    args: {
      mitigationId: t.arg.string({ required: true }),
      description: t.arg.string({ required: false }),
      residualRiskLevel: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const useCase = new UpdateBenefitRiskUseCase(ctx.prisma);
      return useCase.updateMitigation({
        mitigationId: args.mitigationId,
        description: args.description ?? undefined,
        residualRiskLevel: args.residualRiskLevel ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Story 5.9: Bibliography ---

builder.mutationField('manageBibliography', (t) =>
  t.field({
    type: BibliographyResultType,
    args: {
      cerVersionId: t.arg.string({ required: true }),
      citationStyle: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const useCase = new ManageBibliographyUseCase(ctx.prisma);
      return useCase.execute({
        cerVersionId: args.cerVersionId,
        citationStyle: args.citationStyle as any,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Story 5.11: Evaluators & E-Signatures ---

builder.mutationField('assignEvaluator', (t) =>
  t.field({
    type: EvaluatorObjectType,
    args: {
      cerVersionId: t.arg.string({ required: true }),
      sectionId: t.arg.string({ required: true }),
      userId: t.arg.string({ required: true }),
      role: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const useCase = new ManageEvaluatorsUseCase(ctx.prisma);
      return useCase.assign({
        cerVersionId: args.cerVersionId,
        sectionId: args.sectionId,
        userId: args.userId,
        role: args.role,
        assignedBy: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('removeEvaluator', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      evaluatorId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const useCase = new ManageEvaluatorsUseCase(ctx.prisma);
      await useCase.remove({ evaluatorId: args.evaluatorId, removedBy: ctx.user!.id });
      return true;
    },
  }),
);

builder.mutationField('eSignCer', (t) =>
  t.field({
    type: ESignResultType,
    args: {
      cerVersionId: t.arg.string({ required: true }),
      action: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const { ChecksumService } = await import('../../../shared/services/checksum-service.js');
      const checksumService = new ChecksumService();

      const useCase = new ESignDocumentUseCase(ctx.prisma, getEventBus(), checksumService);
      return useCase.execute({
        cerVersionId: args.cerVersionId,
        action: args.action,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Story 5.12: Version Management ---

builder.mutationField('createCerVersion', (t) =>
  t.field({
    type: CreateVersionResultType,
    args: {
      projectId: t.arg.string({ required: true }),
      previousVersionId: t.arg.string({ required: false }),
      versionType: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');
      await checkProjectMembership(ctx, args.projectId);

      const useCase = new ManageVersionsUseCase(ctx.prisma, getEventBus());
      return useCase.execute({
        projectId: args.projectId,
        previousVersionId: args.previousVersionId ?? undefined,
        versionType: args.versionType,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Story 5.13: Export & Lock ---

builder.mutationField('exportCer', (t) =>
  t.field({
    type: ExportCerResultType,
    args: {
      cerVersionId: t.arg.string({ required: true }),
      exportFormat: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

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

      const useCase = new ExportCerUseCase(ctx.prisma, taskService);
      return useCase.execute({
        cerVersionId: args.cerVersionId,
        exportFormat: args.exportFormat,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('lockCer', (t) =>
  t.field({
    type: LockCerResultType,
    args: {
      cerVersionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const cer = await ctx.prisma.cerVersion.findUnique({
        where: { id: args.cerVersionId },
      });

      if (!cer) {
        throw new NotFoundError('CerVersion', args.cerVersionId);
      }

      await checkProjectMembership(ctx, cer.projectId);

      const { ChecksumService } = await import('../../../shared/services/checksum-service.js');
      const checksumService = new ChecksumService();

      const useCase = new LockCerUseCase(ctx.prisma, getEventBus(), checksumService);
      return useCase.execute({
        cerVersionId: args.cerVersionId,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Delete CER Version ---

builder.mutationField('deleteCerVersion', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      cerVersionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'write');

      const cer = await ctx.prisma.cerVersion.findUnique({
        where: { id: args.cerVersionId },
      });

      if (!cer) {
        throw new NotFoundError('CerVersion', args.cerVersionId);
      }

      await checkProjectMembership(ctx, cer.projectId);

      if (cer.status !== 'DRAFT') {
        throw new Error('Cannot delete a locked or finalized CER version');
      }

      // Cascade delete children in transaction
      await ctx.prisma.$transaction([
        ctx.prisma.eSignature.deleteMany({ where: { cerVersionId: args.cerVersionId } }),
        ctx.prisma.crossReference.deleteMany({ where: { cerVersionId: args.cerVersionId } }),
        ctx.prisma.generatedReport.deleteMany({ where: { cerVersionId: args.cerVersionId } }),
        ctx.prisma.bibliographyEntry.deleteMany({ where: { cerVersionId: args.cerVersionId } }),
        ctx.prisma.namedDeviceSearch.deleteMany({ where: { cerVersionId: args.cerVersionId } }),
        ctx.prisma.pccpAcceptanceCriteria.deleteMany({
          where: { cerVersionId: args.cerVersionId },
        }),
        (ctx.prisma as any).pccpDeviationConfig.deleteMany({
          where: { cerVersionId: args.cerVersionId },
        }),
        ctx.prisma.pccpDeviation.deleteMany({ where: { cerVersionId: args.cerVersionId } }),
        ctx.prisma.benefitRiskMitigation.deleteMany({ where: { cerVersionId: args.cerVersionId } }),
        (ctx.prisma as any).benefitRiskAssessment.deleteMany({
          where: { cerVersionId: args.cerVersionId },
        }),
        ctx.prisma.benefitRiskItem.deleteMany({ where: { cerVersionId: args.cerVersionId } }),
        ctx.prisma.gsprMatrixRow.deleteMany({ where: { cerVersionId: args.cerVersionId } }),
        ctx.prisma.evaluator.deleteMany({ where: { cerVersionId: args.cerVersionId } }),
        (ctx.prisma as any).cerSectionDocLink.deleteMany({
          where: { cerSection: { cerVersionId: args.cerVersionId } },
        }),
        (ctx.prisma as any).claimTrace.deleteMany({
          where: { cerSection: { cerVersionId: args.cerVersionId } },
        }),
        ctx.prisma.cerSection.deleteMany({ where: { cerVersionId: args.cerVersionId } }),
        ctx.prisma.cerUpstreamLink.deleteMany({ where: { cerVersionId: args.cerVersionId } }),
        ctx.prisma.cerExternalDocument.deleteMany({ where: { cerVersionId: args.cerVersionId } }),
        ctx.prisma.cerVersion.delete({ where: { id: args.cerVersionId } }),
      ]);

      return true;
    },
  }),
);
