import { builder } from '../../../graphql/builder.js';
import { SoaAnalysisObjectType, ThematicSectionObjectType, SoaSlsLinkObjectType, SoaProgressType, ExtractionGridObjectType, GridColumnObjectType, GridCellObjectType, ArticleExtractionStatusType, GridExtractionProgressType, QualityAssessmentObjectType, SimilarDeviceObjectType, BenchmarkObjectType, ClaimObjectType, ClaimArticleLinkObjectType } from './types.js';
import { checkPermission, checkProjectMembership } from '../../../shared/middleware/rbac-middleware.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import { TrackExtractionStatusUseCase } from '../application/use-cases/track-extraction-status.js';
import { ManageDeviceRegistryUseCase } from '../application/use-cases/manage-device-registry.js';
import { ManageClaimsUseCase } from '../application/use-cases/manage-claims.js';

builder.queryField('soaAnalyses', (t) =>
  t.field({
    type: [SoaAnalysisObjectType],
    args: {
      projectId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');
      await checkProjectMembership(ctx, args.projectId);

      const analyses = await (ctx.prisma as any).soaAnalysis.findMany({
        where: { projectId: args.projectId },
        orderBy: { createdAt: 'desc' },
      });

      return analyses as any;
    },
  }),
);

builder.queryField('soaAnalysis', (t) =>
  t.field({
    type: SoaAnalysisObjectType,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const soa = await (ctx.prisma as any).soaAnalysis.findUnique({
        where: { id: args.id },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.id);
      }

      await checkProjectMembership(ctx, soa.projectId);

      return soa as any;
    },
  }),
);

builder.queryField('soaSections', (t) =>
  t.field({
    type: [ThematicSectionObjectType],
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const soa = await (ctx.prisma as any).soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const sections = await (ctx.prisma as any).thematicSection.findMany({
        where: { soaAnalysisId: args.soaAnalysisId },
        orderBy: { orderIndex: 'asc' },
      });

      return sections as any;
    },
  }),
);

builder.queryField('soaLinkedSessions', (t) =>
  t.field({
    type: [SoaSlsLinkObjectType],
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const soa = await (ctx.prisma as any).soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const links = await (ctx.prisma as any).soaSlsLink.findMany({
        where: { soaAnalysisId: args.soaAnalysisId },
        orderBy: { createdAt: 'asc' },
      });

      return links as any;
    },
  }),
);

builder.queryField('soaProgress', (t) =>
  t.field({
    type: SoaProgressType,
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const soa = await (ctx.prisma as any).soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const sections = await (ctx.prisma as any).thematicSection.findMany({
        where: { soaAnalysisId: args.soaAnalysisId },
        select: { status: true },
      });

      let draftCount = 0;
      let inProgressCount = 0;
      let finalizedCount = 0;

      for (const s of sections) {
        switch (s.status) {
          case 'DRAFT':
            draftCount++;
            break;
          case 'IN_PROGRESS':
            inProgressCount++;
            break;
          case 'FINALIZED':
            finalizedCount++;
            break;
        }
      }

      return {
        totalSections: sections.length,
        draftCount,
        inProgressCount,
        finalizedCount,
      } as any;
    },
  }),
);

// --- Extraction Grid queries (Story 3.2) ---

builder.queryField('extractionGrids', (t) =>
  t.field({
    type: [ExtractionGridObjectType],
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const soa = await (ctx.prisma as any).soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const grids = await (ctx.prisma as any).extractionGrid.findMany({
        where: { soaAnalysisId: args.soaAnalysisId },
        orderBy: { createdAt: 'asc' },
      });

      return grids as any;
    },
  }),
);

builder.queryField('gridColumns', (t) =>
  t.field({
    type: [GridColumnObjectType],
    args: {
      gridId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const columns = await (ctx.prisma as any).gridColumn.findMany({
        where: { extractionGridId: args.gridId },
        orderBy: { orderIndex: 'asc' },
      });

      return columns as any;
    },
  }),
);

builder.queryField('gridCells', (t) =>
  t.field({
    type: [GridCellObjectType],
    args: {
      gridId: t.arg.string({ required: true }),
      articleId: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const where: Record<string, unknown> = { extractionGridId: args.gridId };
      if (args.articleId) {
        where.articleId = args.articleId;
      }

      const cells = await (ctx.prisma as any).gridCell.findMany({
        where,
        orderBy: { createdAt: 'asc' },
      });

      return cells as any;
    },
  }),
);

// --- Extraction Status queries (Story 3.5) ---

builder.queryField('articleExtractionStatus', (t) =>
  t.field({
    type: ArticleExtractionStatusType,
    args: {
      gridId: t.arg.string({ required: true }),
      articleId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const useCase = new TrackExtractionStatusUseCase(ctx.prisma);
      return useCase.getArticleExtractionStatus(args.gridId, args.articleId) as any;
    },
  }),
);

builder.queryField('gridExtractionProgress', (t) =>
  t.field({
    type: GridExtractionProgressType,
    args: {
      gridId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const useCase = new TrackExtractionStatusUseCase(ctx.prisma);
      return useCase.getGridExtractionProgress(args.gridId) as any;
    },
  }),
);

// --- Quality Assessment queries (Story 3.6) ---

builder.queryField('qualityAssessments', (t) =>
  t.field({
    type: [QualityAssessmentObjectType],
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
      articleId: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const soa = await (ctx.prisma as any).soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const where: Record<string, unknown> = { soaAnalysisId: args.soaAnalysisId };
      if (args.articleId) {
        where.articleId = args.articleId;
      }

      const assessments = await (ctx.prisma as any).qualityAssessment.findMany({
        where,
        orderBy: { assessedAt: 'desc' },
      });

      return assessments as any;
    },
  }),
);

// --- Similar Device queries (Story 3.9) ---

builder.queryField('similarDevices', (t) =>
  t.field({
    type: [SimilarDeviceObjectType],
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const soa = await (ctx.prisma as any).soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const useCase = new ManageDeviceRegistryUseCase(ctx.prisma);
      return useCase.getDevicesWithBenchmarks(args.soaAnalysisId) as any;
    },
  }),
);

builder.queryField('deviceBenchmarks', (t) =>
  t.field({
    type: [BenchmarkObjectType],
    args: {
      similarDeviceId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const benchmarks = await (ctx.prisma as any).benchmark.findMany({
        where: { similarDeviceId: args.similarDeviceId },
        orderBy: { createdAt: 'asc' },
      });

      return benchmarks as any;
    },
  }),
);

// --- Claims queries (Story 3.10) ---

builder.queryField('claims', (t) =>
  t.field({
    type: [ClaimObjectType],
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const soa = await (ctx.prisma as any).soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const useCase = new ManageClaimsUseCase(ctx.prisma);
      return useCase.getClaimsForAnalysis(args.soaAnalysisId) as any;
    },
  }),
);

builder.queryField('claimArticleLinks', (t) =>
  t.field({
    type: [ClaimArticleLinkObjectType],
    args: {
      claimId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const links = await (ctx.prisma as any).claimArticleLink.findMany({
        where: { claimId: args.claimId },
        orderBy: { createdAt: 'asc' },
      });

      return links as any;
    },
  }),
);
