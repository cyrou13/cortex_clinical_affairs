import { builder } from '../../../graphql/builder.js';
import {
  SoaAnalysisObjectType,
  ThematicSectionObjectType,
  SoaSlsLinkObjectType,
  SoaProgressType,
  ExtractionGridObjectType,
  GridColumnObjectType,
  GridCellObjectType,
  ArticleExtractionStatusType,
  GridExtractionProgressType,
  QualityAssessmentObjectType,
  QualitySummaryType,
  SimilarDeviceObjectType,
  BenchmarkObjectType,
  AggregatedBenchmarkType,
  ClaimObjectType,
  ClaimArticleLinkObjectType,
  ComparisonTableType,
  TraceabilityReportType,
  GridTemplateObjectType,
  SoaImportObjectType,
  ArticleQualityAssessmentObjectType,
} from './types.js';
import {
  checkPermission,
  checkProjectMembership,
} from '../../../shared/middleware/rbac-middleware.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import { TrackExtractionStatusUseCase } from '../application/use-cases/track-extraction-status.js';
import { AssessQualityUseCase } from '../application/use-cases/assess-quality.js';
import { ManageDeviceRegistryUseCase } from '../application/use-cases/manage-device-registry.js';
import { ManageClaimsUseCase } from '../application/use-cases/manage-claims.js';
import { GenerateComparisonTableUseCase } from '../application/use-cases/generate-comparison-table.js';
import { ValidateClaimsUseCase } from '../application/use-cases/validate-claims.js';
import { ManageGridTemplatesUseCase } from '../application/use-cases/manage-grid-templates.js';
import { GetSoaImportUseCase } from '../application/use-cases/get-soa-import.js';

builder.queryField('soaAnalyses', (t) =>
  t.field({
    type: [SoaAnalysisObjectType],
    args: {
      projectId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');
      await checkProjectMembership(ctx, args.projectId);

      const analyses = await ctx.prisma.soaAnalysis.findMany({
        where: { projectId: args.projectId },
        orderBy: { createdAt: 'desc' },
      });

      return analyses as any;
    },
  }),
);

builder.queryField('soaAnalysesBySlsSession', (t) =>
  t.field({
    type: [SoaAnalysisObjectType],
    args: { slsSessionId: t.arg.string({ required: true }) },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');
      const links = await ctx.prisma.soaSlsLink.findMany({
        where: { slsSessionId: args.slsSessionId },
      });
      if (links.length === 0) return [];
      const soaIds = links.map((l: any) => l.soaAnalysisId);
      return ctx.prisma.soaAnalysis.findMany({
        where: { id: { in: soaIds } },
        orderBy: { createdAt: 'desc' },
      }) as any;
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

      const soa = await ctx.prisma.soaAnalysis.findUnique({
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

      const soa = await ctx.prisma.soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const sections = await ctx.prisma.thematicSection.findMany({
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

      const soa = await ctx.prisma.soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const links = await ctx.prisma.soaSlsLink.findMany({
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

      const soa = await ctx.prisma.soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const sections = await ctx.prisma.thematicSection.findMany({
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
          case 'IN_PROGRESS' as any:
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

      const soa = await ctx.prisma.soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const grids = await ctx.prisma.extractionGrid.findMany({
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

      const columns = await ctx.prisma.gridColumn.findMany({
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
      statusFilter: t.arg.stringList({ required: false }),
      confidenceFilter: t.arg.stringList({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const where: Record<string, unknown> = { extractionGridId: args.gridId };
      if (args.articleId) {
        where.articleId = args.articleId;
      }
      if (args.statusFilter && args.statusFilter.length > 0) {
        where.validationStatus = { in: args.statusFilter };
      }
      if (args.confidenceFilter && args.confidenceFilter.length > 0) {
        where.confidenceLevel = { in: args.confidenceFilter };
      }

      const cells = await ctx.prisma.gridCell.findMany({
        where,
        orderBy: { createdAt: 'asc' },
      });

      return cells as any;
    },
  }),
);

// --- Confidence-based queries (Story 3.4) ---

builder.queryField('lowConfidenceCells', (t) =>
  t.field({
    type: [GridCellObjectType],
    args: {
      gridId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const cells = await ctx.prisma.gridCell.findMany({
        where: {
          extractionGridId: args.gridId,
          confidenceLevel: 'LOW',
        },
        orderBy: { createdAt: 'asc' },
      });

      return cells as any;
    },
  }),
);

builder.queryField('cellSourceQuote', (t) =>
  t.field({
    type: 'JSON',
    args: {
      gridId: t.arg.string({ required: true }),
      articleId: t.arg.string({ required: true }),
      columnId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const cell = await ctx.prisma.gridCell.findFirst({
        where: {
          extractionGridId: args.gridId,
          articleId: args.articleId,
          gridColumnId: args.columnId,
        },
        include: {
          gridColumn: {
            select: { displayName: true },
          },
        },
      });

      if (!cell) {
        return null;
      }

      // Get article reference
      const article = await (ctx.prisma as any).article.findUnique({
        where: { id: args.articleId },
        select: {
          title: true,
          authors: true,
          publicationYear: true,
          journal: true,
        },
      });

      return {
        sourceQuote: (cell as any).sourceQuote,
        articleReference: article
          ? `${article.authors || 'Unknown'}, ${article.publicationYear || 'n.d.'}. ${article.title}. ${article.journal || ''}`
          : 'Unknown reference',
        pageNumber: (cell as any).sourcePageNumber,
        pdfLocationUrl: (cell as any).sourcePageNumber
          ? `/pdf-viewer?articleId=${args.articleId}&page=${(cell as any).sourcePageNumber}`
          : null,
      } as any;
    },
  }),
);

builder.queryField('confidenceStats', (t) =>
  t.field({
    type: 'JSON',
    args: {
      gridId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const cells = await ctx.prisma.gridCell.findMany({
        where: { extractionGridId: args.gridId },
        select: { confidenceLevel: true, confidenceScore: true },
      });

      const stats = {
        total: cells.length,
        high: cells.filter((c: any) => c.confidenceLevel === 'HIGH').length,
        medium: cells.filter((c: any) => c.confidenceLevel === 'MEDIUM').length,
        low: cells.filter((c: any) => c.confidenceLevel === 'LOW').length,
        unscored: cells.filter((c: any) => c.confidenceLevel === 'UNSCORED').length,
        averageScore:
          cells.reduce((sum: number, c: any) => sum + (c.confidenceScore || 0), 0) /
          (cells.length || 1),
      };

      return stats as any;
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

      const soa = await ctx.prisma.soaAnalysis.findUnique({
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

      const assessments = await ctx.prisma.qualityAssessment.findMany({
        where,
        orderBy: { assessedAt: 'desc' },
      });

      return assessments as any;
    },
  }),
);

builder.queryField('qualitySummary', (t) =>
  t.field({
    type: QualitySummaryType,
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const soa = await ctx.prisma.soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const useCase = new AssessQualityUseCase(ctx.prisma);
      return useCase.getCombinedSummary(args.soaAnalysisId) as any;
    },
  }),
);

// --- Article Quality Assessments (AI-generated) ---

builder.queryField('articleQualityAssessments', (t) =>
  t.field({
    type: [ArticleQualityAssessmentObjectType],
    args: {
      gridId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const assessments = await (ctx.prisma as any).articleQualityAssessment.findMany({
        where: { extractionGridId: args.gridId },
        orderBy: { overallScore: 'desc' },
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

      const soa = await ctx.prisma.soaAnalysis.findUnique({
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

      const benchmarks = await ctx.prisma.benchmark.findMany({
        where: { similarDeviceId: args.similarDeviceId },
        orderBy: { createdAt: 'asc' },
      });

      return benchmarks as any;
    },
  }),
);

builder.queryField('aggregatedBenchmarks', (t) =>
  t.field({
    type: [AggregatedBenchmarkType],
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const soa = await ctx.prisma.soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const useCase = new ManageDeviceRegistryUseCase(ctx.prisma);
      return useCase.aggregateBenchmarks(args.soaAnalysisId) as any;
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

      const soa = await ctx.prisma.soaAnalysis.findUnique({
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

      const links = await ctx.prisma.claimArticleLink.findMany({
        where: { claimId: args.claimId },
        orderBy: { createdAt: 'asc' },
      });

      return links as any;
    },
  }),
);

builder.queryField('comparisonTable', (t) =>
  t.field({
    type: ComparisonTableType,
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const soa = await ctx.prisma.soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const useCase = new GenerateComparisonTableUseCase(ctx.prisma);
      return useCase.execute(args.soaAnalysisId) as any;
    },
  }),
);

builder.queryField('traceabilityReport', (t) =>
  t.field({
    type: TraceabilityReportType,
    args: {
      soaAnalysisId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const soa = await ctx.prisma.soaAnalysis.findUnique({
        where: { id: args.soaAnalysisId },
      });

      if (!soa) {
        throw new NotFoundError('SoaAnalysis', args.soaAnalysisId);
      }

      await checkProjectMembership(ctx, soa.projectId);

      const useCase = new ValidateClaimsUseCase(ctx.prisma);
      return useCase.getTraceabilityReport(args.soaAnalysisId) as any;
    },
  }),
);

// --- Grid Template queries (Template System) ---

builder.queryField('gridTemplates', (t) =>
  t.field({
    type: [GridTemplateObjectType],
    args: {
      soaType: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const useCase = new ManageGridTemplatesUseCase(ctx.prisma);
      return useCase.listTemplates(args.soaType ?? undefined) as any;
    },
  }),
);

builder.queryField('gridTemplate', (t) =>
  t.field({
    type: GridTemplateObjectType,
    args: {
      templateId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const useCase = new ManageGridTemplatesUseCase(ctx.prisma);
      return useCase.getTemplate(args.templateId) as any;
    },
  }),
);

// --- SOA Import queries ---

builder.queryField('soaImport', (t) =>
  t.field({
    type: SoaImportObjectType,
    nullable: true,
    args: {
      importId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');

      const useCase = new GetSoaImportUseCase(ctx.prisma);
      const soaImport = await useCase.execute(args.importId);

      await checkProjectMembership(ctx, soaImport.projectId);

      return soaImport as any;
    },
  }),
);

builder.queryField('soaImports', (t) =>
  t.field({
    type: [SoaImportObjectType],
    args: {
      projectId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'read');
      await checkProjectMembership(ctx, args.projectId);

      const imports = await (ctx.prisma as any).soaImport.findMany({
        where: { projectId: args.projectId },
        orderBy: { createdAt: 'desc' },
      });

      return imports as any;
    },
  }),
);
