import { builder } from '../../../graphql/builder.js';
import { SlsSessionObjectType, SlsQueryObjectType, QueryVersionObjectType, QueryExecutionObjectType, ArticleObjectType, PaginatedArticlesType, ArticleCountByStatusType, ArticleFilterInput, AiScoringStatsType, ExclusionCodeObjectType, CustomAiFilterObjectType, RelevanceThresholdsType, ScreeningDecisionObjectType, ReviewGateStatusType, ScreeningAuditEntryType, LockPreflightCheckType, PdfRetrievalStatsType, MinedReferenceObjectType } from './types.js';
import { checkPermission, checkProjectMembership } from '../../../shared/middleware/rbac-middleware.js';
import { GetSlsSessionsUseCase } from '../application/use-cases/get-sessions.js';
import { GetSlsSessionDetailUseCase } from '../application/use-cases/get-session-detail.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import { ArticleRepository } from '../infrastructure/repositories/article-repository.js';
import { ConfigureThresholdsUseCase } from '../application/use-cases/configure-thresholds.js';
import { ValidateReviewGatesUseCase } from '../application/use-cases/validate-review-gates.js';
import { SpotCheckSamplingService } from '../infrastructure/services/spot-check-sampling.js';

builder.queryField('slsSessions', (t) =>
  t.field({
    type: [SlsSessionObjectType],
    args: {
      projectId: t.arg.string({ required: true }),
      status: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');
      await checkProjectMembership(ctx, args.projectId);

      const useCase = new GetSlsSessionsUseCase(ctx.prisma);
      return useCase.execute(args.projectId, args.status ?? undefined) as any;
    },
  }),
);

builder.queryField('slsSession', (t) =>
  t.field({
    type: SlsSessionObjectType,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      const useCase = new GetSlsSessionDetailUseCase(ctx.prisma);
      const session = await useCase.execute(args.id);

      // Check project membership using the session's projectId
      await checkProjectMembership(ctx, session.projectId);

      return session as any;
    },
  }),
);

builder.queryField('slsQueries', (t) =>
  t.field({
    type: [SlsQueryObjectType],
    args: {
      sessionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      // Look up session to check project membership
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const queries = await ctx.prisma.slsQuery.findMany({
        where: { sessionId: args.sessionId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      return queries as any;
    },
  }),
);

builder.queryField('queryVersions', (t) =>
  t.field({
    type: [QueryVersionObjectType],
    args: {
      queryId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      // Look up query -> session to check project membership
      const query = await ctx.prisma.slsQuery.findUnique({
        where: { id: args.queryId },
      });

      if (!query) {
        throw new NotFoundError('SlsQuery', args.queryId);
      }

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: query.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', query.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const versions = await ctx.prisma.queryVersion.findMany({
        where: { queryId: args.queryId },
        orderBy: { version: 'desc' },
      });

      return versions as any;
    },
  }),
);

builder.queryField('queryExecutions', (t) =>
  t.field({
    type: [QueryExecutionObjectType],
    args: {
      queryId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      // Look up query -> session to check project membership
      const query = await ctx.prisma.slsQuery.findUnique({
        where: { id: args.queryId },
      });

      if (!query) {
        throw new NotFoundError('SlsQuery', args.queryId);
      }

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: query.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', query.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const executions = await ctx.prisma.queryExecution.findMany({
        where: { queryId: args.queryId },
        orderBy: { executedAt: 'desc' },
      });

      return executions as any;
    },
  }),
);

// --- Article queries ---

builder.queryField('articles', (t) =>
  t.field({
    type: PaginatedArticlesType,
    args: {
      sessionId: t.arg.string({ required: true }),
      filter: t.arg({ type: ArticleFilterInput, required: false }),
      offset: t.arg.int({ required: false }),
      limit: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      // Look up session to check project membership
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const repo = new ArticleRepository(ctx.prisma);
      const filter = args.filter
        ? {
            status: (args.filter.status ?? undefined) as any,
            yearFrom: args.filter.yearFrom ?? undefined,
            yearTo: args.filter.yearTo ?? undefined,
            sourceDatabase: args.filter.sourceDatabase ?? undefined,
            searchText: args.filter.searchText ?? undefined,
          }
        : undefined;

      return repo.findBySessionId(
        args.sessionId,
        filter,
        args.offset ?? 0,
        args.limit ?? 50,
      ) as any;
    },
  }),
);

builder.queryField('article', (t) =>
  t.field({
    type: ArticleObjectType,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      const repo = new ArticleRepository(ctx.prisma);
      const article = await repo.findById(args.id);

      if (!article) {
        throw new NotFoundError('Article', args.id);
      }

      // Check project membership via article -> session
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: article.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', article.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      return article as any;
    },
  }),
);

builder.queryField('articleCountByStatus', (t) =>
  t.field({
    type: ArticleCountByStatusType,
    args: {
      sessionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      // Look up session to check project membership
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const repo = new ArticleRepository(ctx.prisma);
      const counts = await repo.countByStatus(args.sessionId);

      return { counts } as any;
    },
  }),
);

// --- AI Scoring Stats query ---

builder.queryField('aiScoringStats', (t) =>
  t.field({
    type: AiScoringStatsType,
    args: {
      sessionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      // Look up session to check project membership
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      // Get category counts from scored articles
      const scoredArticles = await ctx.prisma.article.groupBy({
        by: ['aiCategory'],
        where: {
          sessionId: args.sessionId,
          status: 'SCORED',
          aiCategory: { not: null },
        },
        _count: { aiCategory: true },
      });

      let likelyRelevantCount = 0;
      let uncertainCount = 0;
      let likelyIrrelevantCount = 0;

      for (const row of scoredArticles) {
        switch (row.aiCategory) {
          case 'likely_relevant':
            likelyRelevantCount = row._count.aiCategory;
            break;
          case 'uncertain':
            uncertainCount = row._count.aiCategory;
            break;
          case 'likely_irrelevant':
            likelyIrrelevantCount = row._count.aiCategory;
            break;
        }
      }

      const totalScored = likelyRelevantCount + uncertainCount + likelyIrrelevantCount;
      const acceptanceRate = totalScored > 0
        ? (likelyRelevantCount + uncertainCount) / totalScored
        : 0;

      return {
        likelyRelevantCount,
        uncertainCount,
        likelyIrrelevantCount,
        totalScored,
        acceptanceRate,
      } as any;
    },
  }),
);

// --- Exclusion Codes query (Story 2.7) ---

builder.queryField('exclusionCodes', (t) =>
  t.field({
    type: [ExclusionCodeObjectType],
    args: {
      sessionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      // Look up session to check project membership
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const codes = await ctx.prisma.exclusionCode.findMany({
        where: { sessionId: args.sessionId, isHidden: false },
        orderBy: { displayOrder: 'asc' },
      });

      return codes as any;
    },
  }),
);

// --- Custom AI Filters query (Story 2.7) ---

builder.queryField('customAiFilters', (t) =>
  t.field({
    type: [CustomAiFilterObjectType],
    args: {
      sessionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      // Look up session to check project membership
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const filters = await ctx.prisma.customAiFilter.findMany({
        where: { sessionId: args.sessionId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      return filters as any;
    },
  }),
);

// --- Relevance Thresholds query (Story 2.7) ---

builder.queryField('relevanceThresholds', (t) =>
  t.field({
    type: RelevanceThresholdsType,
    args: {
      sessionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      // Look up session to check project membership
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new ConfigureThresholdsUseCase(ctx.prisma);
      return useCase.getThresholds(args.sessionId) as any;
    },
  }),
);

// --- Screening Decisions query (Story 2.8) ---

builder.queryField('screeningDecisions', (t) =>
  t.field({
    type: [ScreeningDecisionObjectType],
    args: {
      articleId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      // Look up article -> session to check project membership
      const article = await ctx.prisma.article.findUnique({
        where: { id: args.articleId },
      });

      if (!article) {
        throw new NotFoundError('Article', args.articleId);
      }

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: article.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', article.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const decisions = await ctx.prisma.screeningDecision.findMany({
        where: { articleId: args.articleId },
        orderBy: { timestamp: 'desc' },
      });

      return decisions as any;
    },
  }),
);

// --- Review Gate Status query (Story 2.9) ---

builder.queryField('reviewGateStatus', (t) =>
  t.field({
    type: ReviewGateStatusType,
    args: {
      sessionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new ValidateReviewGatesUseCase(ctx.prisma);
      return useCase.execute(args.sessionId) as any;
    },
  }),
);

// --- Spot-Check Sample query (Story 2.9) ---

builder.queryField('spotCheckSample', (t) =>
  t.field({
    type: [ArticleObjectType],
    args: {
      sessionId: t.arg.string({ required: true }),
      category: t.arg.string({ required: true }),
      count: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const service = new SpotCheckSamplingService(ctx.prisma);
      return service.generateSample(
        args.sessionId,
        args.category as 'likely_relevant' | 'likely_irrelevant',
        args.count ?? 20,
      ) as any;
    },
  }),
);

// --- Screening Audit Log query (Story 2.9) ---

builder.queryField('screeningAuditLog', (t) =>
  t.field({
    type: [ScreeningAuditEntryType],
    args: {
      sessionId: t.arg.string({ required: true }),
      userId: t.arg.string({ required: false }),
      decision: t.arg.string({ required: false }),
      offset: t.arg.int({ required: false }),
      limit: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      // Build filter
      const where: Record<string, unknown> = {
        article: { sessionId: args.sessionId },
      };
      if (args.userId) where.userId = args.userId;
      if (args.decision) where.decision = args.decision;

      const decisions = await ctx.prisma.screeningDecision.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: args.offset ?? 0,
        take: args.limit ?? 50,
      });

      return decisions as any;
    },
  }),
);

// --- Lock Preflight Check query (Story 2.10) ---

builder.queryField('lockPreflightCheck', (t) =>
  t.field({
    type: LockPreflightCheckType,
    args: {
      sessionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      // Count articles by status
      const articles = await ctx.prisma.article.findMany({
        where: { sessionId: args.sessionId },
        select: { status: true },
      });

      const pendingCount = articles.filter(
        (a: { status: string }) => a.status === 'PENDING' || a.status === 'SCORED',
      ).length;
      const includedCount = articles.filter(
        (a: { status: string }) => a.status === 'INCLUDED' || a.status === 'FINAL_INCLUDED',
      ).length;
      const excludedCount = articles.filter(
        (a: { status: string }) => a.status === 'EXCLUDED' || a.status === 'FINAL_EXCLUDED',
      ).length;

      // Check review gates
      const gateValidator = new ValidateReviewGatesUseCase(ctx.prisma);
      const gateStatus = await gateValidator.execute(args.sessionId);

      return {
        pendingCount,
        allGatesMet: gateStatus.allGatesMet,
        includedCount,
        excludedCount,
        totalArticles: articles.length,
      } as any;
    },
  }),
);

// --- PRISMA Statistics query (Story 2.10) ---

builder.queryField('prismaStatistics', (t) =>
  t.field({
    type: 'JSON',
    nullable: true,
    args: {
      sessionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      return session.prismaStatistics ?? null;
    },
  }),
);

// --- PDF Retrieval Stats query (Story 2.11) ---

builder.queryField('pdfRetrievalStats', (t) =>
  t.field({
    type: PdfRetrievalStatsType,
    args: {
      sessionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      // Count included articles (total pool for PDF retrieval)
      const articles = await ctx.prisma.article.findMany({
        where: {
          sessionId: args.sessionId,
          status: { in: ['INCLUDED', 'FINAL_INCLUDED'] },
        },
        select: { pdfStatus: true },
      });

      const totalIncluded = articles.length;
      let pdfFound = 0;
      let pdfNotFound = 0;
      let mismatches = 0;
      let verified = 0;
      let retrieving = 0;

      for (const a of articles) {
        switch (a.pdfStatus) {
          case 'FOUND':
            pdfFound++;
            break;
          case 'NOT_FOUND':
            pdfNotFound++;
            break;
          case 'MISMATCH':
            mismatches++;
            break;
          case 'VERIFIED':
          case 'MANUAL_UPLOAD':
            verified++;
            break;
          case 'RETRIEVING':
            retrieving++;
            break;
        }
      }

      return {
        totalIncluded,
        pdfFound,
        pdfNotFound,
        mismatches,
        verified,
        retrieving,
      } as any;
    },
  }),
);

// --- Mined References query (Story 2.12) ---

builder.queryField('minedReferences', (t) =>
  t.field({
    type: [MinedReferenceObjectType],
    args: {
      sessionId: t.arg.string({ required: true }),
      approvalStatus: t.arg.string({ required: false }),
      validationStatus: t.arg.string({ required: false }),
      excludeDuplicates: t.arg.boolean({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'read');

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const where: Record<string, unknown> = { sessionId: args.sessionId };
      if (args.approvalStatus) where.approvalStatus = args.approvalStatus;
      if (args.validationStatus) where.validationStatus = args.validationStatus;
      if (args.excludeDuplicates) where.isDuplicate = false;

      const references = await (ctx.prisma as any).minedReference.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return references as any;
    },
  }),
);
