import { builder } from '../../../graphql/builder.js';
import {
  CreateSoaResultType,
  LinkSlsSessionsResultType,
  DependencyCheckResultType,
  CreateGridResultType,
  PopulateGridRowsResultType,
  UpdateCellResultType,
  ExtractGridDataResultType,
  CellValidationResultType,
  AssessQualityResultType,
  UpdateSectionContentResultType,
  FinalizeSectionResultType,
  DraftNarrativeResultType,
  SimilarDeviceObjectType,
  BenchmarkObjectType,
  ClaimObjectType,
  ClaimArticleLinkObjectType,
  LockSoaResultType,
  CreateTemplateResultType,
  DeleteTemplateResultType,
  ImportSoaDocumentResultType,
  ConfirmSoaImportResultType,
} from './types.js';
import {
  checkPermission,
  checkProjectMembership,
} from '../../../shared/middleware/rbac-middleware.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import { CreateSoaUseCase } from '../application/use-cases/create-soa.js';
import { LinkSlsSessionsUseCase } from '../application/use-cases/link-sls-sessions.js';
import { CheckDependencyUseCase } from '../application/use-cases/check-dependency.js';
import { ConfigureGridUseCase } from '../application/use-cases/configure-grid.js';
import { PopulateGridRowsUseCase } from '../application/use-cases/populate-grid-rows.js';
import { UpdateCellUseCase } from '../application/use-cases/update-cell.js';
import { ExtractGridDataUseCase } from '../application/use-cases/extract-grid-data.js';
import { ValidateExtractionUseCase } from '../application/use-cases/validate-extraction.js';
import { AssessQualityUseCase } from '../application/use-cases/assess-quality.js';
import { ManageSectionUseCase } from '../application/use-cases/manage-section.js';
import { DraftNarrativeUseCase } from '../application/use-cases/draft-narrative.js';
import { ManageDeviceRegistryUseCase } from '../application/use-cases/manage-device-registry.js';
import { ManageClaimsUseCase } from '../application/use-cases/manage-claims.js';
import { LockSoaUseCase } from '../application/use-cases/lock-soa.js';
import { ManageGridTemplatesUseCase } from '../application/use-cases/manage-grid-templates.js';
import { ImportSoaDocumentUseCase } from '../application/use-cases/import-soa-document.js';
import { ConfirmSoaImportUseCase } from '../application/use-cases/confirm-soa-import.js';
import { UpdateSoaImportDataUseCase } from '../application/use-cases/update-soa-import-data.js';
import { getRedis } from '../../../config/redis.js';
import { getEventBus } from '../../../shared/events/rabbitmq-event-bus.js';

// --- SOA Creation mutations (Story 3.1) ---

builder.mutationField('createSoaAnalysis', (t) =>
  t.field({
    type: CreateSoaResultType,
    args: {
      projectId: t.arg.string({ required: true }),
      name: t.arg.string({ required: true }),
      type: t.arg.string({ required: true }),
      description: t.arg.string({ required: false }),
      slsSessionIds: t.arg.stringList({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');
      await checkProjectMembership(ctx, args.projectId);

      const useCase = new CreateSoaUseCase(ctx.prisma);
      return useCase.execute({
        projectId: args.projectId,
        name: args.name,
        type: args.type,
        description: args.description ?? undefined,
        slsSessionIds: args.slsSessionIds,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('linkSlsSessions', (t) =>
  t.field({
    type: LinkSlsSessionsResultType,
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
      slsSessionIds: t.arg.stringList({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const soa = await ctx.prisma.soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const useCase = new LinkSlsSessionsUseCase(ctx.prisma);
      return useCase.execute({
        soaAnalysisId: args.soaAnalysisId,
        slsSessionIds: args.slsSessionIds,
      }) as any;
    },
  }),
);

builder.mutationField('checkDeviceSoaDependency', (t) =>
  t.field({
    type: DependencyCheckResultType,
    args: {
      projectId: t.arg.string({ required: true }),
      soaType: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');
      await checkProjectMembership(ctx, args.projectId);

      const useCase = new CheckDependencyUseCase(ctx.prisma);
      return useCase.execute(args.projectId, args.soaType) as any;
    },
  }),
);

// --- Extraction Grid mutations (Story 3.2) ---

builder.mutationField('createExtractionGrid', (t) =>
  t.field({
    type: CreateGridResultType,
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
      name: t.arg.string({ required: true }),
      thematicSectionId: t.arg.string({ required: false }),
      templateId: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const soa = await ctx.prisma.soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const useCase = new ConfigureGridUseCase(ctx.prisma);
      return useCase.createGrid({
        soaAnalysisId: args.soaAnalysisId,
        name: args.name,
        thematicSectionId: args.thematicSectionId ?? undefined,
        templateId: args.templateId ?? undefined,
      }) as any;
    },
  }),
);

builder.mutationField('addGridColumn', (t) =>
  t.field({
    type: 'JSON',
    args: {
      gridId: t.arg.string({ required: true }),
      name: t.arg.string({ required: true }),
      displayName: t.arg.string({ required: true }),
      dataType: t.arg.string({ required: true }),
      isRequired: t.arg.boolean({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const useCase = new ConfigureGridUseCase(ctx.prisma);
      return useCase.addColumn({
        gridId: args.gridId,
        name: args.name,
        displayName: args.displayName,
        dataType: args.dataType,
        isRequired: args.isRequired ?? undefined,
      }) as any;
    },
  }),
);

builder.mutationField('reorderGridColumns', (t) =>
  t.field({
    type: 'JSON',
    args: {
      gridId: t.arg.string({ required: true }),
      columnIds: t.arg.stringList({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const useCase = new ConfigureGridUseCase(ctx.prisma);
      return useCase.reorderColumns(args.gridId, args.columnIds) as any;
    },
  }),
);

builder.mutationField('renameGridColumn', (t) =>
  t.field({
    type: 'JSON',
    args: {
      gridId: t.arg.string({ required: true }),
      columnId: t.arg.string({ required: true }),
      newName: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const useCase = new ConfigureGridUseCase(ctx.prisma);
      return useCase.renameColumn(args.gridId, args.columnId, args.newName) as any;
    },
  }),
);

builder.mutationField('removeGridColumn', (t) =>
  t.field({
    type: 'JSON',
    args: {
      gridId: t.arg.string({ required: true }),
      columnId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const useCase = new ConfigureGridUseCase(ctx.prisma);
      return useCase.removeColumn(args.gridId, args.columnId) as any;
    },
  }),
);

builder.mutationField('populateGridRows', (t) =>
  t.field({
    type: PopulateGridRowsResultType,
    args: {
      gridId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const useCase = new PopulateGridRowsUseCase(ctx.prisma);
      return useCase.execute(args.gridId) as any;
    },
  }),
);

builder.mutationField('updateGridCell', (t) =>
  t.field({
    type: UpdateCellResultType,
    args: {
      gridId: t.arg.string({ required: true }),
      articleId: t.arg.string({ required: true }),
      columnId: t.arg.string({ required: true }),
      value: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const useCase = new UpdateCellUseCase(ctx.prisma);
      return useCase.execute({
        gridId: args.gridId,
        articleId: args.articleId,
        columnId: args.columnId,
        value: args.value ?? null,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- AI Grid Extraction mutation (Story 3.3) ---

builder.mutationField('extractGridData', (t) =>
  t.field({
    type: ExtractGridDataResultType,
    args: {
      gridId: t.arg.string({ required: true }),
      articleIds: t.arg.stringList({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const redis = getRedis();
      const enqueueJob = async (queue: string, data: unknown): Promise<string> => {
        await redis.publish('task:enqueued', JSON.stringify(data));
        return (data as Record<string, string>).taskId ?? '';
      };

      const useCase = new ExtractGridDataUseCase(ctx.prisma, enqueueJob);
      return useCase.execute({
        gridId: args.gridId,
        articleIds: args.articleIds ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Cell Validation mutations (Story 3.4) ---

builder.mutationField('validateCell', (t) =>
  t.field({
    type: CellValidationResultType,
    args: {
      gridId: t.arg.string({ required: true }),
      articleId: t.arg.string({ required: true }),
      columnId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const useCase = new ValidateExtractionUseCase(ctx.prisma);
      return useCase.validateCell(args.gridId, args.articleId, args.columnId, ctx.user!.id) as any;
    },
  }),
);

builder.mutationField('correctCell', (t) =>
  t.field({
    type: CellValidationResultType,
    args: {
      gridId: t.arg.string({ required: true }),
      articleId: t.arg.string({ required: true }),
      columnId: t.arg.string({ required: true }),
      newValue: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const useCase = new ValidateExtractionUseCase(ctx.prisma);
      return useCase.correctCell(
        args.gridId,
        args.articleId,
        args.columnId,
        args.newValue,
        ctx.user!.id,
      ) as any;
    },
  }),
);

builder.mutationField('flagCell', (t) =>
  t.field({
    type: CellValidationResultType,
    args: {
      gridId: t.arg.string({ required: true }),
      articleId: t.arg.string({ required: true }),
      columnId: t.arg.string({ required: true }),
      reason: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const useCase = new ValidateExtractionUseCase(ctx.prisma);
      return useCase.flagCell(
        args.gridId,
        args.articleId,
        args.columnId,
        args.reason,
        ctx.user!.id,
      ) as any;
    },
  }),
);

builder.mutationField('flagLowConfidenceCells', (t) =>
  t.field({
    type: 'JSON',
    args: {
      gridId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const result = await ctx.prisma.gridCell.updateMany({
        where: {
          extractionGridId: args.gridId,
          confidenceLevel: 'LOW',
          validationStatus: 'PENDING',
        },
        data: {
          validationStatus: 'FLAGGED',
        },
      });

      return { flaggedCount: result.count } as any;
    },
  }),
);

// --- Quality Assessment mutation (Story 3.6) ---

builder.mutationField('assessQuality', (t) =>
  t.field({
    type: AssessQualityResultType,
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
      articleId: t.arg.string({ required: true }),
      assessmentType: t.arg.string({ required: true }),
      assessmentData: t.arg({ type: 'JSON', required: true }),
      dataContributionLevel: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const soa = await ctx.prisma.soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const useCase = new AssessQualityUseCase(ctx.prisma);
      return useCase.execute({
        soaAnalysisId: args.soaAnalysisId,
        articleId: args.articleId,
        assessmentType: args.assessmentType,
        assessmentData: args.assessmentData as Record<string, unknown>,
        dataContributionLevel: args.dataContributionLevel,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Section Management mutations (Story 3.7) ---

builder.mutationField('updateSectionContent', (t) =>
  t.field({
    type: UpdateSectionContentResultType,
    args: {
      sectionId: t.arg.string({ required: true }),
      narrativeContent: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const useCase = new ManageSectionUseCase(ctx.prisma);
      return useCase.updateContent(args.sectionId, args.narrativeContent, ctx.user!.id) as any;
    },
  }),
);

builder.mutationField('finalizeSection', (t) =>
  t.field({
    type: FinalizeSectionResultType,
    args: {
      sectionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const useCase = new ManageSectionUseCase(ctx.prisma);
      return useCase.finalizeSection(args.sectionId, ctx.user!.id) as any;
    },
  }),
);

// --- Narrative Drafting mutation (Story 3.8) ---

builder.mutationField('draftNarrative', (t) =>
  t.field({
    type: DraftNarrativeResultType,
    args: {
      sectionId: t.arg.string({ required: true }),
      soaAnalysisId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const soa = await ctx.prisma.soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const redis = getRedis();
      const enqueueJob = async (queue: string, data: unknown): Promise<string> => {
        await redis.publish('task:enqueued', JSON.stringify(data));
        return (data as Record<string, string>).taskId ?? '';
      };

      const useCase = new DraftNarrativeUseCase(ctx.prisma, enqueueJob);
      return useCase.execute({
        sectionId: args.sectionId,
        soaAnalysisId: args.soaAnalysisId,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Device Registry mutations (Story 3.9) ---

builder.mutationField('addSimilarDevice', (t) =>
  t.field({
    type: SimilarDeviceObjectType,
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
      deviceName: t.arg.string({ required: true }),
      manufacturer: t.arg.string({ required: true }),
      indication: t.arg.string({ required: true }),
      regulatoryStatus: t.arg.string({ required: true }),
      metadata: t.arg({ type: 'JSON', required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const soa = await ctx.prisma.soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const useCase = new ManageDeviceRegistryUseCase(ctx.prisma);
      return useCase.addDevice({
        soaAnalysisId: args.soaAnalysisId,
        deviceName: args.deviceName,
        manufacturer: args.manufacturer,
        indication: args.indication,
        regulatoryStatus: args.regulatoryStatus,
        metadata: args.metadata as Record<string, unknown> | undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('addBenchmark', (t) =>
  t.field({
    type: BenchmarkObjectType,
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
      similarDeviceId: t.arg.string({ required: true }),
      metricName: t.arg.string({ required: true }),
      metricValue: t.arg.string({ required: true }),
      unit: t.arg.string({ required: true }),
      sourceArticleId: t.arg.string({ required: false }),
      sourceDescription: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const useCase = new ManageDeviceRegistryUseCase(ctx.prisma);
      return useCase.addBenchmark({
        soaAnalysisId: args.soaAnalysisId,
        similarDeviceId: args.similarDeviceId,
        metricName: args.metricName,
        metricValue: args.metricValue,
        unit: args.unit,
        sourceArticleId: args.sourceArticleId ?? undefined,
        sourceDescription: args.sourceDescription ?? undefined,
      }) as any;
    },
  }),
);

// --- Claims mutations (Story 3.10) ---

builder.mutationField('createClaim', (t) =>
  t.field({
    type: ClaimObjectType,
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
      statementText: t.arg.string({ required: true }),
      thematicSectionId: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const soa = await ctx.prisma.soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const useCase = new ManageClaimsUseCase(ctx.prisma);
      return useCase.createClaim({
        soaAnalysisId: args.soaAnalysisId,
        statementText: args.statementText,
        thematicSectionId: args.thematicSectionId ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('linkClaimToArticle', (t) =>
  t.field({
    type: ClaimArticleLinkObjectType,
    args: {
      claimId: t.arg.string({ required: true }),
      articleId: t.arg.string({ required: true }),
      sourceQuote: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const useCase = new ManageClaimsUseCase(ctx.prisma);
      return useCase.linkClaimToArticle({
        claimId: args.claimId,
        articleId: args.articleId,
        sourceQuote: args.sourceQuote ?? undefined,
      }) as any;
    },
  }),
);

// --- Lock SOA mutation (Story 3.11) ---

builder.mutationField('lockSoaAnalysis', (t) =>
  t.field({
    type: LockSoaResultType,
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const soa = await ctx.prisma.soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const useCase = new LockSoaUseCase(ctx.prisma, getEventBus());
      return useCase.execute({
        soaAnalysisId: args.soaAnalysisId,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Grid Template mutations (Template System) ---

builder.mutationField('createGridTemplate', (t) =>
  t.field({
    type: CreateTemplateResultType,
    args: {
      name: t.arg.string({ required: true }),
      soaType: t.arg.string({ required: true }),
      description: t.arg.string({ required: false }),
      columns: t.arg({ type: 'JSON', required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const useCase = new ManageGridTemplatesUseCase(ctx.prisma);
      return useCase.createTemplate({
        name: args.name,
        soaType: args.soaType,
        description: args.description ?? undefined,
        columns: args.columns as any[],
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('duplicateGridTemplate', (t) =>
  t.field({
    type: CreateTemplateResultType,
    args: {
      sourceTemplateId: t.arg.string({ required: true }),
      newName: t.arg.string({ required: true }),
      soaType: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const useCase = new ManageGridTemplatesUseCase(ctx.prisma);
      return useCase.duplicateTemplate({
        sourceTemplateId: args.sourceTemplateId,
        newName: args.newName,
        soaType: args.soaType ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('updateGridTemplate', (t) =>
  t.field({
    type: 'JSON',
    args: {
      templateId: t.arg.string({ required: true }),
      name: t.arg.string({ required: false }),
      description: t.arg.string({ required: false }),
      columns: t.arg({ type: 'JSON', required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const useCase = new ManageGridTemplatesUseCase(ctx.prisma);
      return useCase.updateTemplate({
        templateId: args.templateId,
        name: args.name ?? undefined,
        description: args.description ?? undefined,
        columns: (args.columns as any[] | undefined) ?? undefined,
      }) as any;
    },
  }),
);

builder.mutationField('deleteGridTemplate', (t) =>
  t.field({
    type: DeleteTemplateResultType,
    args: {
      templateId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const useCase = new ManageGridTemplatesUseCase(ctx.prisma);
      return useCase.deleteTemplate(args.templateId) as any;
    },
  }),
);

// --- Delete SOA Analysis mutation ---

builder.mutationField('deleteSoaAnalysis', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const soa = await ctx.prisma.soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      if (soa.status !== 'DRAFT') {
        throw new Error('Cannot delete a locked SOA analysis');
      }

      // Cascade delete children in transaction
      await ctx.prisma.$transaction([
        ctx.prisma.claimArticleLink.deleteMany({
          where: { claim: { soaAnalysisId: args.soaAnalysisId } },
        }),
        ctx.prisma.gridCell.deleteMany({
          where: { extractionGrid: { soaAnalysisId: args.soaAnalysisId } },
        }),
        ctx.prisma.gridColumn.deleteMany({
          where: { extractionGrid: { soaAnalysisId: args.soaAnalysisId } },
        }),
        ctx.prisma.soaBenchmark.deleteMany({
          where: { soaAnalysisId: args.soaAnalysisId },
        }),
        ctx.prisma.qualityAssessment.deleteMany({
          where: { soaAnalysisId: args.soaAnalysisId },
        }),
        ctx.prisma.extractionGrid.deleteMany({
          where: { soaAnalysisId: args.soaAnalysisId },
        }),
        ctx.prisma.claim.deleteMany({
          where: { soaAnalysisId: args.soaAnalysisId },
        }),
        ctx.prisma.similarDevice.deleteMany({
          where: { soaAnalysisId: args.soaAnalysisId },
        }),
        ctx.prisma.thematicSection.deleteMany({
          where: { soaAnalysisId: args.soaAnalysisId },
        }),
        ctx.prisma.soaSlsLink.deleteMany({
          where: { soaAnalysisId: args.soaAnalysisId },
        }),
        ctx.prisma.soaAnalysis.delete({
          where: { id: args.soaAnalysisId },
        }),
      ]);

      return true;
    },
  }),
);

// --- SOA Import mutations ---

builder.mutationField('importSoaDocument', (t) =>
  t.field({
    type: ImportSoaDocumentResultType,
    args: {
      projectId: t.arg.string({ required: true }),
      fileName: t.arg.string({ required: true }),
      fileContent: t.arg.string({ required: true }),
      fileFormat: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');
      await checkProjectMembership(ctx, args.projectId);

      const redis = getRedis();
      const enqueueJob = async (_queue: string, data: unknown): Promise<string> => {
        await redis.publish('task:enqueued', JSON.stringify(data));
        return (data as Record<string, string>).taskId ?? '';
      };

      const useCase = new ImportSoaDocumentUseCase(ctx.prisma, enqueueJob);
      return useCase.execute({
        projectId: args.projectId,
        fileName: args.fileName,
        fileContent: args.fileContent,
        fileFormat: args.fileFormat as 'PDF' | 'DOCX',
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('confirmSoaImport', (t) =>
  t.field({
    type: ConfirmSoaImportResultType,
    args: {
      importId: t.arg.string({ required: true }),
      editedData: t.arg({ type: 'JSON', required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const soaImport = await (ctx.prisma as any).soaImport.findUnique({
        where: { id: args.importId },
      });

      if (!soaImport) {
        throw new NotFoundError('SoaImport', args.importId);
      }

      await checkProjectMembership(ctx, soaImport.projectId);

      const useCase = new ConfirmSoaImportUseCase(ctx.prisma);
      return useCase.execute({
        importId: args.importId,
        editedData: args.editedData as any,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('cancelSoaImport', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      importId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const soaImport = await (ctx.prisma as any).soaImport.findUnique({
        where: { id: args.importId },
      });

      if (!soaImport) {
        throw new NotFoundError('SoaImport', args.importId);
      }

      await checkProjectMembership(ctx, soaImport.projectId);

      if (!['PROCESSING', 'REVIEW'].includes(soaImport.status)) {
        throw new Error('Cannot cancel import in current status');
      }

      await (ctx.prisma as any).soaImport.update({
        where: { id: args.importId },
        data: { status: 'CANCELLED' },
      });

      return true;
    },
  }),
);

builder.mutationField('updateSoaImportData', (t) =>
  t.field({
    type: 'JSON',
    args: {
      importId: t.arg.string({ required: true }),
      editedData: t.arg({ type: 'JSON', required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const soaImport = await (ctx.prisma as any).soaImport.findUnique({
        where: { id: args.importId },
      });

      if (!soaImport) {
        throw new NotFoundError('SoaImport', args.importId);
      }

      await checkProjectMembership(ctx, soaImport.projectId);

      const useCase = new UpdateSoaImportDataUseCase(ctx.prisma);
      return useCase.execute(args.importId, args.editedData as any) as any;
    },
  }),
);
