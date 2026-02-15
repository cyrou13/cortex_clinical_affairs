import { builder } from '../../../graphql/builder.js';
import {
  CerVersionObjectType,
  CerUpstreamLinkObjectType,
  CerExternalDocumentObjectType,
  CerSectionObjectType,
  TraceabilityResultType,
  ClaimTraceResultType,
  ProofPackageResultType,
  GsprMatrixRowObjectType,
  CrossReferencesResultType,
  BenefitRiskConclusionResultType,
  EvaluatorObjectType,
} from './types.js';
import { checkPermission, checkProjectMembership } from '../../../shared/middleware/rbac-middleware.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import { ManageExternalDocsUseCase } from '../application/use-cases/manage-external-docs.js';
import { EnforceTraceabilityUseCase } from '../application/use-cases/enforce-traceability.js';
import { GetClaimTraceUseCase } from '../application/use-cases/get-claim-trace.js';
import { ExportProofPackageUseCase } from '../application/use-cases/export-proof-package.js';
import { ManageCrossReferencesUseCase } from '../application/use-cases/manage-cross-references.js';
import { GenerateBenefitRiskConclusionUseCase } from '../application/use-cases/generate-benefit-risk-conclusion.js';
import { ManageEvaluatorsUseCase } from '../application/use-cases/manage-evaluators.js';

// --- Story 5.1: CER Versions ---

builder.queryField('cerVersions', (t) =>
  t.field({
    type: [CerVersionObjectType],
    args: {
      projectId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'read');
      await checkProjectMembership(ctx, args.projectId);

      const versions = await (ctx.prisma as any).cerVersion.findMany({
        where: { projectId: args.projectId },
        orderBy: { createdAt: 'desc' },
      });

      return versions as any;
    },
  }),
);

builder.queryField('cerVersion', (t) =>
  t.field({
    type: CerVersionObjectType,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'read');

      const version = await (ctx.prisma as any).cerVersion.findUnique({
        where: { id: args.id },
      });

      if (!version) {
        throw new NotFoundError('CerVersion', args.id);
      }

      await checkProjectMembership(ctx, version.projectId);

      return version as any;
    },
  }),
);

// --- Story 5.1: Upstream Links ---

builder.queryField('cerUpstreamLinks', (t) =>
  t.field({
    type: [CerUpstreamLinkObjectType],
    args: {
      cerVersionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'read');

      const cerVersion = await (ctx.prisma as any).cerVersion.findUnique({
        where: { id: args.cerVersionId },
      });

      if (!cerVersion) {
        throw new NotFoundError('CerVersion', args.cerVersionId);
      }

      await checkProjectMembership(ctx, cerVersion.projectId);

      const links = await (ctx.prisma as any).cerUpstreamLink.findMany({
        where: { cerVersionId: args.cerVersionId },
      });

      return links as any;
    },
  }),
);

// --- Story 5.2: External Documents ---

builder.queryField('cerExternalDocs', (t) =>
  t.field({
    type: [CerExternalDocumentObjectType],
    args: {
      cerVersionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'read');

      const useCase = new ManageExternalDocsUseCase(ctx.prisma);
      return useCase.list(args.cerVersionId) as any;
    },
  }),
);

// --- Story 5.4/5.5: CER Sections ---

builder.queryField('cerSections', (t) =>
  t.field({
    type: [CerSectionObjectType],
    args: {
      cerVersionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'read');

      const cerVersion = await (ctx.prisma as any).cerVersion.findUnique({
        where: { id: args.cerVersionId },
      });

      if (!cerVersion) {
        throw new NotFoundError('CerVersion', args.cerVersionId);
      }

      await checkProjectMembership(ctx, cerVersion.projectId);

      const sections = await (ctx.prisma as any).cerSection.findMany({
        where: { cerVersionId: args.cerVersionId },
        orderBy: { orderIndex: 'asc' },
      });

      return sections as any;
    },
  }),
);

builder.queryField('cerSection', (t) =>
  t.field({
    type: CerSectionObjectType,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'read');

      const section = await (ctx.prisma as any).cerSection.findUnique({
        where: { id: args.id },
      });

      if (!section) {
        throw new NotFoundError('CerSection', args.id);
      }

      return section as any;
    },
  }),
);

// --- Story 5.6: Traceability ---

builder.queryField('cerTraceability', (t) =>
  t.field({
    type: TraceabilityResultType,
    args: {
      cerVersionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'read');

      const useCase = new EnforceTraceabilityUseCase(ctx.prisma);
      return useCase.execute({ cerVersionId: args.cerVersionId }) as any;
    },
  }),
);

builder.queryField('claimTrace', (t) =>
  t.field({
    type: ClaimTraceResultType,
    args: {
      claimTraceId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'read');

      const useCase = new GetClaimTraceUseCase(ctx.prisma);
      return useCase.execute({ claimTraceId: args.claimTraceId }) as any;
    },
  }),
);

builder.queryField('proofPackage', (t) =>
  t.field({
    type: ProofPackageResultType,
    args: {
      claimTraceId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'read');

      const useCase = new ExportProofPackageUseCase(ctx.prisma);
      return useCase.execute({ claimTraceId: args.claimTraceId }) as any;
    },
  }),
);

// --- Story 5.7: GSPR Matrix Rows ---

builder.queryField('gsprMatrixRows', (t) =>
  t.field({
    type: [GsprMatrixRowObjectType],
    args: {
      cerVersionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'read');

      const rows = await (ctx.prisma as any).gsprMatrixRow.findMany({
        where: { cerVersionId: args.cerVersionId },
        orderBy: { gsprId: 'asc' },
      });

      return rows as any;
    },
  }),
);

// --- Story 5.8: Benefit-Risk Conclusion ---

builder.queryField('benefitRiskConclusion', (t) =>
  t.field({
    type: BenefitRiskConclusionResultType,
    args: {
      cerVersionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'read');

      const useCase = new GenerateBenefitRiskConclusionUseCase(ctx.prisma);
      return useCase.execute({ cerVersionId: args.cerVersionId }) as any;
    },
  }),
);

// --- Story 5.9: Cross References ---

builder.queryField('crossReferences', (t) =>
  t.field({
    type: CrossReferencesResultType,
    args: {
      cerVersionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'read');

      const useCase = new ManageCrossReferencesUseCase(ctx.prisma);
      return useCase.execute({ cerVersionId: args.cerVersionId }) as any;
    },
  }),
);

// --- Story 5.11: Evaluators ---

builder.queryField('cerEvaluators', (t) =>
  t.field({
    type: [EvaluatorObjectType],
    args: {
      cerVersionId: t.arg.string({ required: true }),
      sectionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'cer', 'read');

      const useCase = new ManageEvaluatorsUseCase(ctx.prisma);
      return useCase.listBySection(args.cerVersionId, args.sectionId) as any;
    },
  }),
);
