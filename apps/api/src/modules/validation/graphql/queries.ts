import { builder } from '../../../graphql/builder.js';
import { ValidationStudyObjectType, ProtocolObjectType, ProtocolAmendmentObjectType, AcceptanceCriterionObjectType, DataImportObjectType, ComputeDiffResultType, GsprMappingObjectType } from './types.js';
import { checkPermission, checkProjectMembership } from '../../../shared/middleware/rbac-middleware.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import { ManageImportVersionsUseCase } from '../application/use-cases/manage-import-versions.js';

// --- Validation Study queries (Story 4.1) ---

builder.queryField('validationStudies', (t) =>
  t.field({
    type: [ValidationStudyObjectType],
    args: {
      projectId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'read');
      await checkProjectMembership(ctx, args.projectId);

      const studies = await (ctx.prisma as any).validationStudy.findMany({
        where: { projectId: args.projectId },
        orderBy: { createdAt: 'desc' },
      });

      return studies as any;
    },
  }),
);

builder.queryField('validationStudy', (t) =>
  t.field({
    type: ValidationStudyObjectType,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'read');

      const study = await (ctx.prisma as any).validationStudy.findUnique({
        where: { id: args.id },
      });

      if (!study) {
        throw new NotFoundError('ValidationStudy', args.id);
      }

      await checkProjectMembership(ctx, study.projectId);

      return study as any;
    },
  }),
);

builder.queryField('acceptanceCriteria', (t) =>
  t.field({
    type: [AcceptanceCriterionObjectType],
    args: {
      validationStudyId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'read');

      const criteria = await (ctx.prisma as any).acceptanceCriterion.findMany({
        where: { validationStudyId: args.validationStudyId },
        orderBy: { name: 'asc' },
      });

      return criteria as any;
    },
  }),
);

// --- Protocol queries (Story 4.2) ---

builder.queryField('protocol', (t) =>
  t.field({
    type: ProtocolObjectType,
    nullable: true,
    args: {
      validationStudyId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'read');

      const protocol = await (ctx.prisma as any).protocol.findFirst({
        where: { validationStudyId: args.validationStudyId },
        orderBy: { createdAt: 'desc' },
      });

      return (protocol ?? null) as any;
    },
  }),
);

builder.queryField('protocolAmendments', (t) =>
  t.field({
    type: [ProtocolAmendmentObjectType],
    args: {
      protocolId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'read');

      const amendments = await (ctx.prisma as any).protocolAmendment.findMany({
        where: { protocolId: args.protocolId },
        orderBy: { createdAt: 'desc' },
      });

      return amendments as any;
    },
  }),
);

// --- Data Import queries (Story 4.3) ---

builder.queryField('dataImports', (t) =>
  t.field({
    type: [DataImportObjectType],
    args: {
      validationStudyId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'read');

      const imports = await (ctx.prisma as any).dataImport.findMany({
        where: { validationStudyId: args.validationStudyId },
        orderBy: { version: 'desc' },
      });

      return imports as any;
    },
  }),
);

builder.queryField('computeImportDiff', (t) =>
  t.field({
    type: ComputeDiffResultType,
    args: {
      validationStudyId: t.arg.string({ required: true }),
      versionA: t.arg.int({ required: true }),
      versionB: t.arg.int({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'read');

      const useCase = new ManageImportVersionsUseCase(ctx.prisma);
      return useCase.computeDiff({
        validationStudyId: args.validationStudyId,
        versionA: args.versionA,
        versionB: args.versionB,
      }) as any;
    },
  }),
);

// --- GSPR Mapping queries (Story 4.8) ---

builder.queryField('gsprMappings', (t) =>
  t.field({
    type: [GsprMappingObjectType],
    args: {
      validationStudyId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'validation', 'read');

      const mappings = await (ctx.prisma as any).gsprMapping.findMany({
        where: { validationStudyId: args.validationStudyId },
        orderBy: { gsprId: 'asc' },
      });

      return mappings as any;
    },
  }),
);
