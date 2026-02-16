import { builder } from '../../../graphql/builder.js';
import {
  CreateStudyResultType,
  DefineProtocolResultType,
  AmendProtocolResultType,
  ImportXlsResultType,
  SetActiveVersionResultType,
  RollbackResultType,
  MapResultsResultType,
  GsprMappingObjectType,
  LockValidationResultType,
  LinkSoaBenchmarksResultType,
} from './types.js';
import {
  checkPermission,
  checkProjectMembership,
} from '../../../shared/middleware/rbac-middleware.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import { CreateStudyUseCase } from '../application/use-cases/create-study.js';
import { DefineProtocolUseCase } from '../application/use-cases/define-protocol.js';
import { AmendProtocolUseCase } from '../application/use-cases/amend-protocol.js';
import { LinkSoaBenchmarksUseCase } from '../application/use-cases/link-soa-benchmarks.js';
import { LaunchMiniLiteratureSearchUseCase } from '../application/use-cases/launch-mini-literature-search.js';
import { ImportXlsUseCase } from '../application/use-cases/import-xls.js';
import { ManageImportVersionsUseCase } from '../application/use-cases/manage-import-versions.js';
import { MapResultsUseCase } from '../application/use-cases/map-results.js';
import { MapGsprUseCase } from '../application/use-cases/map-gspr.js';
import { LockValidationUseCase } from '../application/use-cases/lock-validation.js';
import { getEventBus } from '../../../shared/events/rabbitmq-event-bus.js';

// --- Study Creation mutations (Story 4.1) ---

builder.mutationField('createValidationStudy', (t) =>
  t.field({
    type: CreateStudyResultType,
    args: {
      projectId: t.arg.string({ required: true }),
      name: t.arg.string({ required: true }),
      type: t.arg.string({ required: true }),
      description: t.arg.string({ required: false }),
      soaAnalysisId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'write');
      await checkProjectMembership(ctx, args.projectId);

      const useCase = new CreateStudyUseCase(ctx.prisma);
      return useCase.execute({
        projectId: args.projectId,
        name: args.name,
        type: args.type,
        description: args.description ?? undefined,
        soaAnalysisId: args.soaAnalysisId,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('linkSoaBenchmarks', (t) =>
  t.field({
    type: LinkSoaBenchmarksResultType,
    args: {
      validationStudyId: t.arg.string({ required: true }),
      soaAnalysisId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'write');

      const useCase = new LinkSoaBenchmarksUseCase(ctx.prisma);
      return useCase.execute({
        validationStudyId: args.validationStudyId,
        soaAnalysisId: args.soaAnalysisId,
      }) as any;
    },
  }),
);

builder.mutationField('launchMiniLiteratureSearch', (t) =>
  t.field({
    type: 'String',
    args: {
      validationStudyId: t.arg.string({ required: true }),
      searchTerm: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'write');

      const useCase = new LaunchMiniLiteratureSearchUseCase(ctx.prisma);
      const result = await useCase.execute({
        validationStudyId: args.validationStudyId,
        searchTerm: args.searchTerm,
        userId: ctx.user!.id,
      });
      return result.slsSessionId;
    },
  }),
);

// --- Protocol mutations (Story 4.2) ---

builder.mutationField('defineProtocol', (t) =>
  t.field({
    type: DefineProtocolResultType,
    args: {
      validationStudyId: t.arg.string({ required: true }),
      summary: t.arg.string({ required: false }),
      endpoints: t.arg.string({ required: false }),
      sampleSizeJustification: t.arg.string({ required: false }),
      statisticalStrategy: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'write');

      const useCase = new DefineProtocolUseCase(ctx.prisma);
      return useCase.execute({
        validationStudyId: args.validationStudyId,
        summary: args.summary ?? undefined,
        endpoints: args.endpoints ?? undefined,
        sampleSizeJustification: args.sampleSizeJustification ?? undefined,
        statisticalStrategy: args.statisticalStrategy ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('amendProtocol', (t) =>
  t.field({
    type: AmendProtocolResultType,
    args: {
      protocolId: t.arg.string({ required: true }),
      reason: t.arg.string({ required: true }),
      summary: t.arg.string({ required: false }),
      endpoints: t.arg.string({ required: false }),
      sampleSizeJustification: t.arg.string({ required: false }),
      statisticalStrategy: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'write');

      const useCase = new AmendProtocolUseCase(ctx.prisma);
      return useCase.execute({
        protocolId: args.protocolId,
        reason: args.reason,
        summary: args.summary ?? undefined,
        endpoints: args.endpoints ?? undefined,
        sampleSizeJustification: args.sampleSizeJustification ?? undefined,
        statisticalStrategy: args.statisticalStrategy ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Data Import mutations (Story 4.3) ---

builder.mutationField('importXls', (t) =>
  t.field({
    type: ImportXlsResultType,
    args: {
      validationStudyId: t.arg.string({ required: true }),
      fileName: t.arg.string({ required: true }),
      headers: t.arg.stringList({ required: true }),
      rawRows: t.arg({ type: 'JSON', required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'write');

      const useCase = new ImportXlsUseCase(ctx.prisma);
      return useCase.execute({
        validationStudyId: args.validationStudyId,
        fileName: args.fileName,
        headers: args.headers,
        rawRows: args.rawRows as unknown[][],
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('setActiveImportVersion', (t) =>
  t.field({
    type: SetActiveVersionResultType,
    args: {
      validationStudyId: t.arg.string({ required: true }),
      version: t.arg.int({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'write');

      const useCase = new ManageImportVersionsUseCase(ctx.prisma);
      return useCase.setActiveVersion({
        validationStudyId: args.validationStudyId,
        version: args.version,
      }) as any;
    },
  }),
);

builder.mutationField('rollbackImportVersion', (t) =>
  t.field({
    type: RollbackResultType,
    args: {
      validationStudyId: t.arg.string({ required: true }),
      targetVersion: t.arg.int({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'write');

      const useCase = new ManageImportVersionsUseCase(ctx.prisma);
      return useCase.rollbackToVersion({
        validationStudyId: args.validationStudyId,
        targetVersion: args.targetVersion,
      }) as any;
    },
  }),
);

// --- Results Mapping mutation (Story 4.4) ---

builder.mutationField('mapResults', (t) =>
  t.field({
    type: MapResultsResultType,
    args: {
      validationStudyId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'write');

      const useCase = new MapResultsUseCase(ctx.prisma);
      return useCase.execute({
        validationStudyId: args.validationStudyId,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- GSPR Mapping mutations (Story 4.8) ---

builder.mutationField('mapGspr', (t) =>
  t.field({
    type: GsprMappingObjectType,
    args: {
      validationStudyId: t.arg.string({ required: true }),
      gsprId: t.arg.string({ required: true }),
      status: t.arg.string({ required: true }),
      justification: t.arg.string({ required: false }),
      evidenceReferences: t.arg.stringList({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'write');

      const useCase = new MapGsprUseCase(ctx.prisma);
      return useCase.execute({
        validationStudyId: args.validationStudyId,
        gsprId: args.gsprId,
        status: args.status as 'COMPLIANT' | 'PARTIAL' | 'NOT_APPLICABLE',
        justification: args.justification ?? undefined,
        evidenceReferences: args.evidenceReferences ?? undefined,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('deleteGsprMapping', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      validationStudyId: t.arg.string({ required: true }),
      gsprId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'write');

      const useCase = new MapGsprUseCase(ctx.prisma);
      await useCase.delete({
        validationStudyId: args.validationStudyId,
        gsprId: args.gsprId,
        userId: ctx.user!.id,
      });
      return true;
    },
  }),
);

// --- Lock Validation mutation (Story 4.8) ---

builder.mutationField('lockValidationStudy', (t) =>
  t.field({
    type: LockValidationResultType,
    args: {
      validationStudyId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'write');

      const study = await ctx.prisma.validationStudy.findUnique({
        where: { id: args.validationStudyId },
      });

      if (!study) {
        throw new NotFoundError('ValidationStudy', args.validationStudyId);
      }

      await checkProjectMembership(ctx, study.projectId);

      const useCase = new LockValidationUseCase(ctx.prisma, getEventBus());
      return useCase.execute({
        validationStudyId: args.validationStudyId,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);
