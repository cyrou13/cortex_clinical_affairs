import type { Prisma, ArticleStatus } from '@prisma/client';
import { builder } from '../../../graphql/builder.js';
import {
  SlsSessionObjectType,
  SlsQueryObjectType,
  ExecuteQueryResultType,
  GenerateQueryResultType,
  ImportArticlesResultType,
  ArticleObjectType,
  LaunchScoringResultType,
  ExclusionCodeObjectType,
  CustomAiFilterObjectType,
  RelevanceThresholdsType,
  BulkScreenResultType,
  SpotCheckResultType,
  LockDatasetResultType,
  PdfRetrievalResultType,
  ResolvePdfMismatchResultType,
  ManualArticleResultType,
  MineReferencesResultType,
  ApproveReferenceResultType,
  BulkApproveResultType,
} from './types.js';
import {
  checkPermission,
  checkProjectMembership,
} from '../../../shared/middleware/rbac-middleware.js';
import { CreateSlsSessionUseCase } from '../application/use-cases/create-session.js';
import { ConstructQueryUseCase } from '../application/use-cases/construct-query.js';
import { UpdateQueryUseCase } from '../application/use-cases/update-query.js';
import { DuplicateQueryUseCase } from '../application/use-cases/duplicate-query.js';
import { ExecuteQueryUseCase } from '../application/use-cases/execute-query.js';
import { ImportArticlesUseCase } from '../application/use-cases/import-articles.js';
import { ScoreArticlesUseCase } from '../application/use-cases/score-articles.js';
import { ManageExclusionCodesUseCase } from '../application/use-cases/manage-exclusion-codes.js';
import { ConfigureThresholdsUseCase } from '../application/use-cases/configure-thresholds.js';
import { ConfigureCustomFilterUseCase } from '../application/use-cases/configure-custom-filter.js';
import { TaskService } from '../../../shared/services/task-service.js';
import { UpdateSlsSessionInput } from '@cortex/shared';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { getRedis } from '../../../config/redis.js';
import { validateTransition, transitionStatus } from '../domain/entities/article.js';
import type { ArticleStatusEnum } from '@cortex/shared';
import { ScreenArticleUseCase } from '../application/use-cases/screen-article.js';
import { BulkScreenArticlesUseCase } from '../application/use-cases/bulk-screen-articles.js';
import { SpotCheckArticleUseCase } from '../application/use-cases/spot-check-article.js';
import { LockDatasetUseCase } from '../application/use-cases/lock-dataset.js';
import { getEventBus } from '../../../shared/events/rabbitmq-event-bus.js';
import { RetrievePdfsUseCase } from '../application/use-cases/retrieve-pdfs.js';
import { ResolvePdfMismatchUseCase } from '../application/use-cases/resolve-pdf-mismatch.js';
import { MinioStorageService } from '../infrastructure/services/minio-storage-service.js';
import { AddManualArticleUseCase } from '../application/use-cases/add-manual-article.js';
import { MineReferencesUseCase } from '../application/use-cases/mine-references.js';
import { ApproveMinedReferenceUseCase } from '../application/use-cases/approve-mined-reference.js';
import { GenerateQueryFromTextUseCase } from '../application/use-cases/generate-query-from-text.js';

builder.mutationField('createSlsSession', (t) =>
  t.field({
    type: SlsSessionObjectType,
    args: {
      name: t.arg.string({ required: true }),
      type: t.arg.string({ required: true }),
      projectId: t.arg.string({ required: true }),
      scopeFields: t.arg({ type: 'JSON', required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');
      await checkProjectMembership(ctx, args.projectId);

      const useCase = new CreateSlsSessionUseCase(ctx.prisma);
      return useCase.execute(args, ctx.user!.id) as any;
    },
  }),
);

builder.mutationField('updateSlsSession', (t) =>
  t.field({
    type: SlsSessionObjectType,
    args: {
      id: t.arg.string({ required: true }),
      name: t.arg.string({ required: false }),
      scopeFields: t.arg({ type: 'JSON', required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Find the session first to check project membership
      const existing = await ctx.prisma.slsSession.findUnique({
        where: { id: args.id },
      });

      if (!existing) {
        throw new NotFoundError('SlsSession', args.id);
      }

      await checkProjectMembership(ctx, existing.projectId);

      // Validate update input
      const updateInput: Record<string, unknown> = {};
      if (args.name !== undefined && args.name !== null) updateInput.name = args.name;
      if (args.scopeFields !== undefined && args.scopeFields !== null)
        updateInput.scopeFields = args.scopeFields;

      const parsed = UpdateSlsSessionInput.safeParse(updateInput);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues.map((i: { message: string }) => i.message).join(', '),
        );
      }

      const data: Record<string, unknown> = {};
      if (parsed.data.name !== undefined) data.name = parsed.data.name;
      if (parsed.data.scopeFields !== undefined) {
        data.scopeFields = parsed.data.scopeFields as Prisma.InputJsonValue;
      }

      const updated = await ctx.prisma.slsSession.update({
        where: { id: args.id },
        data,
        include: {
          articles: true,
          queries: true,
          exclusionCodes: true,
        },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.user!.id,
          action: 'sls.session.updated',
          targetType: 'slsSession',
          targetId: args.id,
          before: {
            name: existing.name,
            scopeFields: existing.scopeFields,
          } as unknown as Prisma.InputJsonValue,
          after: data as unknown as Prisma.InputJsonValue,
        },
      });

      return updated as any;
    },
  }),
);

// --- Query mutations ---

builder.mutationField('createQuery', (t) =>
  t.field({
    type: SlsQueryObjectType,
    args: {
      sessionId: t.arg.string({ required: true }),
      name: t.arg.string({ required: true }),
      queryString: t.arg.string({ required: true }),
      dateFrom: t.arg.string({ required: false }),
      dateTo: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via session
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new ConstructQueryUseCase(ctx.prisma);
      return useCase.execute(
        {
          sessionId: args.sessionId,
          name: args.name,
          queryString: args.queryString,
          dateFrom: args.dateFrom ?? undefined,
          dateTo: args.dateTo ?? undefined,
        },
        ctx.user!.id,
      ) as any;
    },
  }),
);

builder.mutationField('updateQuery', (t) =>
  t.field({
    type: SlsQueryObjectType,
    args: {
      id: t.arg.string({ required: true }),
      queryString: t.arg.string({ required: true }),
      dateFrom: t.arg.string({ required: false }),
      dateTo: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via query -> session
      const query = await ctx.prisma.slsQuery.findUnique({
        where: { id: args.id },
      });

      if (!query) {
        throw new NotFoundError('SlsQuery', args.id);
      }

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: query.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', query.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new UpdateQueryUseCase(ctx.prisma);
      return useCase.execute(
        args.id,
        {
          queryString: args.queryString,
          dateFrom: args.dateFrom,
          dateTo: args.dateTo,
        },
        ctx.user!.id,
      ) as any;
    },
  }),
);

builder.mutationField('duplicateQuery', (t) =>
  t.field({
    type: SlsQueryObjectType,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via query -> session
      const query = await ctx.prisma.slsQuery.findUnique({
        where: { id: args.id },
      });

      if (!query) {
        throw new NotFoundError('SlsQuery', args.id);
      }

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: query.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', query.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new DuplicateQueryUseCase(ctx.prisma);
      return useCase.execute(args.id, ctx.user!.id) as any;
    },
  }),
);

builder.mutationField('deleteQuery', (t) =>
  t.field({
    type: SlsQueryObjectType,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via query -> session
      const query = await ctx.prisma.slsQuery.findUnique({
        where: { id: args.id },
      });

      if (!query) {
        throw new NotFoundError('SlsQuery', args.id);
      }

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: query.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', query.sessionId);
      }

      if (session.status === 'LOCKED') {
        throw new ValidationError('Cannot delete queries in a locked session');
      }

      await checkProjectMembership(ctx, session.projectId);

      // Soft-delete: set isActive to false
      const deleted = await ctx.prisma.slsQuery.update({
        where: { id: args.id },
        data: { isActive: false },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.user!.id,
          action: 'sls.query.deleted',
          targetType: 'slsQuery',
          targetId: args.id,
          before: { isActive: true } as unknown as Prisma.InputJsonValue,
          after: { isActive: false } as unknown as Prisma.InputJsonValue,
        },
      });

      return deleted as any;
    },
  }),
);

// --- Generate Query from Text mutation ---

builder.mutationField('generateQueryFromText', (t) =>
  t.field({
    type: GenerateQueryResultType,
    args: {
      sessionId: t.arg.string({ required: true }),
      description: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via session
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new GenerateQueryFromTextUseCase(ctx.prisma);
      return useCase.execute(
        { sessionId: args.sessionId, description: args.description },
        ctx.user!.id,
      ) as any;
    },
  }),
);

// --- Execute Query mutation ---

builder.mutationField('executeQuery', (t) =>
  t.field({
    type: ExecuteQueryResultType,
    args: {
      queryId: t.arg.string({ required: true }),
      databases: t.arg.stringList({ required: true }),
      sessionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via session
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new ExecuteQueryUseCase(ctx.prisma, getRedis());
      return useCase.execute(
        { queryId: args.queryId, databases: args.databases, sessionId: args.sessionId },
        ctx.user!.id,
      ) as any;
    },
  }),
);

// --- Import Articles mutation ---

builder.mutationField('importArticles', (t) =>
  t.field({
    type: ImportArticlesResultType,
    args: {
      sessionId: t.arg.string({ required: true }),
      queryId: t.arg.string({ required: true }),
      executionId: t.arg.string({ required: true }),
      articles: t.arg({ type: ['JSON'], required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via session
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new ImportArticlesUseCase(ctx.prisma);
      return useCase.execute({
        sessionId: args.sessionId,
        articles: args.articles as any,
        queryId: args.queryId,
        executionId: args.executionId,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- Update Article Status mutation ---

builder.mutationField('updateArticleStatus', (t) =>
  t.field({
    type: ArticleObjectType,
    args: {
      id: t.arg.string({ required: true }),
      status: t.arg.string({ required: true }),
      reason: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Find the article
      const article = await ctx.prisma.article.findUnique({
        where: { id: args.id },
      });

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

      // Validate and perform the status transition
      const newStatus = args.status as ArticleStatusEnum;
      if (!validateTransition(article.status as ArticleStatusEnum, newStatus)) {
        throw new ValidationError(
          `Invalid status transition from ${article.status} to ${newStatus}`,
        );
      }

      const updateFields = transitionStatus(
        article,
        newStatus,
        ctx.user!.id,
        args.reason ?? undefined,
      );

      const updated = await ctx.prisma.article.update({
        where: { id: args.id },
        data: { status: updateFields.status as ArticleStatus },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.user!.id,
          action: 'sls.article.statusUpdated',
          targetType: 'article',
          targetId: args.id,
          before: { status: article.status } as unknown as Prisma.InputJsonValue,
          after: {
            status: newStatus,
            reason: args.reason ?? null,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      return updated as any;
    },
  }),
);

// --- AI Scoring mutations ---

builder.mutationField('launchAiScoring', (t) =>
  t.field({
    type: LaunchScoringResultType,
    args: {
      sessionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via session
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new ScoreArticlesUseCase(ctx.prisma, getRedis());
      return useCase.execute(args.sessionId, ctx.user!.id) as any;
    },
  }),
);

builder.mutationField('cancelAiScoring', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      taskId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      const redis = getRedis();
      const taskService = new TaskService(ctx.prisma, redis);

      try {
        await taskService.cancelTask(args.taskId, ctx.user!.id);

        // Set the Redis cancellation flag so the worker picks it up
        await redis.set(`task:cancelled:${args.taskId}`, '1', 'EX', 3600);

        return true;
      } catch {
        return false;
      }
    },
  }),
);

// --- Exclusion Code mutations (Story 2.7) ---

builder.mutationField('addExclusionCode', (t) =>
  t.field({
    type: ExclusionCodeObjectType,
    args: {
      sessionId: t.arg.string({ required: true }),
      code: t.arg.string({ required: true }),
      label: t.arg.string({ required: true }),
      shortCode: t.arg.string({ required: true }),
      description: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via session
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new ManageExclusionCodesUseCase(ctx.prisma);
      return useCase.addExclusionCode(
        args.sessionId,
        {
          code: args.code,
          label: args.label,
          shortCode: args.shortCode,
          description: args.description ?? undefined,
        },
        ctx.user!.id,
      ) as any;
    },
  }),
);

builder.mutationField('renameExclusionCode', (t) =>
  t.field({
    type: ExclusionCodeObjectType,
    args: {
      id: t.arg.string({ required: true }),
      label: t.arg.string({ required: true }),
      shortCode: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Look up code -> session to check project membership
      const code = await ctx.prisma.exclusionCode.findUnique({
        where: { id: args.id },
      });

      if (!code) {
        throw new NotFoundError('ExclusionCode', args.id);
      }

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: code.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', code.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new ManageExclusionCodesUseCase(ctx.prisma);
      return useCase.renameExclusionCode(
        args.id,
        {
          label: args.label,
          shortCode: args.shortCode ?? undefined,
        },
        ctx.user!.id,
      ) as any;
    },
  }),
);

builder.mutationField('hideExclusionCode', (t) =>
  t.field({
    type: ExclusionCodeObjectType,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Look up code -> session to check project membership
      const code = await ctx.prisma.exclusionCode.findUnique({
        where: { id: args.id },
      });

      if (!code) {
        throw new NotFoundError('ExclusionCode', args.id);
      }

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: code.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', code.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new ManageExclusionCodesUseCase(ctx.prisma);
      return useCase.hideExclusionCode(args.id, ctx.user!.id) as any;
    },
  }),
);

builder.mutationField('reorderExclusionCodes', (t) =>
  t.field({
    type: [ExclusionCodeObjectType],
    args: {
      sessionId: t.arg.string({ required: true }),
      orderedIds: t.arg.stringList({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via session
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new ManageExclusionCodesUseCase(ctx.prisma);
      return useCase.reorderExclusionCodes(args.sessionId, args.orderedIds, ctx.user!.id) as any;
    },
  }),
);

// --- Threshold configuration mutation (Story 2.7) ---

builder.mutationField('configureRelevanceThresholds', (t) =>
  t.field({
    type: RelevanceThresholdsType,
    args: {
      sessionId: t.arg.string({ required: true }),
      likelyRelevantThreshold: t.arg.int({ required: true }),
      uncertainLowerThreshold: t.arg.int({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via session
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new ConfigureThresholdsUseCase(ctx.prisma);
      return useCase.configureThresholds(
        args.sessionId,
        args.likelyRelevantThreshold,
        args.uncertainLowerThreshold,
        ctx.user!.id,
      ) as any;
    },
  }),
);

// --- Custom AI Filter mutations (Story 2.7) ---

builder.mutationField('createCustomAiFilter', (t) =>
  t.field({
    type: CustomAiFilterObjectType,
    args: {
      sessionId: t.arg.string({ required: true }),
      name: t.arg.string({ required: true }),
      criterion: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via session
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new ConfigureCustomFilterUseCase(ctx.prisma, getRedis());
      return useCase.createCustomFilter(
        args.sessionId,
        { name: args.name, criterion: args.criterion },
        ctx.user!.id,
      ) as any;
    },
  }),
);

builder.mutationField('updateCustomAiFilter', (t) =>
  t.field({
    type: CustomAiFilterObjectType,
    args: {
      id: t.arg.string({ required: true }),
      name: t.arg.string({ required: false }),
      criterion: t.arg.string({ required: false }),
      isActive: t.arg.boolean({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Look up filter -> session to check project membership
      const filter = await ctx.prisma.customAiFilter.findUnique({
        where: { id: args.id },
      });

      if (!filter) {
        throw new NotFoundError('CustomAiFilter', args.id);
      }

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: filter.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', filter.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const updateInput: Record<string, unknown> = {};
      if (args.name !== undefined && args.name !== null) updateInput.name = args.name;
      if (args.criterion !== undefined && args.criterion !== null)
        updateInput.criterion = args.criterion;
      if (args.isActive !== undefined && args.isActive !== null)
        updateInput.isActive = args.isActive;

      const useCase = new ConfigureCustomFilterUseCase(ctx.prisma, getRedis());
      return useCase.updateCustomFilter(args.id, updateInput, ctx.user!.id) as any;
    },
  }),
);

builder.mutationField('deleteCustomAiFilter', (t) =>
  t.field({
    type: CustomAiFilterObjectType,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Look up filter -> session to check project membership
      const filter = await ctx.prisma.customAiFilter.findUnique({
        where: { id: args.id },
      });

      if (!filter) {
        throw new NotFoundError('CustomAiFilter', args.id);
      }

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: filter.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', filter.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new ConfigureCustomFilterUseCase(ctx.prisma, getRedis());
      return useCase.deleteCustomFilter(args.id, ctx.user!.id) as any;
    },
  }),
);

builder.mutationField('launchCustomFilterScoring', (t) =>
  t.field({
    type: LaunchScoringResultType,
    args: {
      sessionId: t.arg.string({ required: true }),
      filterId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via session
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new ConfigureCustomFilterUseCase(ctx.prisma, getRedis());
      return useCase.launchCustomFilterScoring(args.sessionId, args.filterId, ctx.user!.id) as any;
    },
  }),
);

// --- Screening mutations (Story 2.8) ---

builder.mutationField('screenArticle', (t) =>
  t.field({
    type: ArticleObjectType,
    args: {
      articleId: t.arg.string({ required: true }),
      decision: t.arg.string({ required: true }),
      exclusionCodeId: t.arg.string({ required: false }),
      reason: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via article -> session
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

      const useCase = new ScreenArticleUseCase(ctx.prisma);
      return useCase.execute(
        {
          articleId: args.articleId,
          decision: args.decision,
          exclusionCodeId: args.exclusionCodeId ?? undefined,
          reason: args.reason,
        },
        ctx.user!.id,
      ) as any;
    },
  }),
);

builder.mutationField('bulkScreenArticles', (t) =>
  t.field({
    type: BulkScreenResultType,
    args: {
      sessionId: t.arg.string({ required: true }),
      articleIds: t.arg.stringList({ required: true }),
      decision: t.arg.string({ required: true }),
      exclusionCodeId: t.arg.string({ required: false }),
      reason: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via session
      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new BulkScreenArticlesUseCase(ctx.prisma);
      return useCase.execute(
        args.sessionId,
        {
          articleIds: args.articleIds,
          decision: args.decision,
          exclusionCodeId: args.exclusionCodeId ?? undefined,
          reason: args.reason,
        },
        ctx.user!.id,
      ) as any;
    },
  }),
);

// --- Spot-check mutation (Story 2.9) ---

builder.mutationField('spotCheckArticle', (t) =>
  t.field({
    type: SpotCheckResultType,
    args: {
      articleId: t.arg.string({ required: true }),
      agrees: t.arg.boolean({ required: true }),
      correctedDecision: t.arg.string({ required: false }),
      exclusionCodeId: t.arg.string({ required: false }),
      reason: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via article -> session
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

      const useCase = new SpotCheckArticleUseCase(ctx.prisma);
      return useCase.execute({
        articleId: args.articleId,
        userId: ctx.user!.id,
        agrees: args.agrees,
        correctedDecision: (args.correctedDecision ?? undefined) as
          | 'INCLUDED'
          | 'EXCLUDED'
          | undefined,
        exclusionCodeId: args.exclusionCodeId ?? undefined,
        reason: args.reason,
      }) as any;
    },
  }),
);

// --- Lock Dataset mutation (Story 2.10) ---

builder.mutationField('lockSlsDataset', (t) =>
  t.field({
    type: LockDatasetResultType,
    args: {
      sessionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new LockDatasetUseCase(ctx.prisma, getEventBus());
      return useCase.execute({
        sessionId: args.sessionId,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

// --- PDF Retrieval mutations (Story 2.11) ---

builder.mutationField('launchPdfRetrieval', (t) =>
  t.field({
    type: PdfRetrievalResultType,
    args: {
      sessionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const redis = getRedis();
      const enqueueJob = async (queue: string, data: Record<string, unknown>) => {
        await redis.publish(
          'task:enqueued',
          JSON.stringify({
            taskId: data.taskId,
            type: queue,
            status: 'PENDING',
            metadata: data,
            createdBy: data.userId,
          }),
        );
        return data.taskId as string;
      };

      const useCase = new RetrievePdfsUseCase(ctx.prisma, enqueueJob);
      return useCase.execute({
        sessionId: args.sessionId,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('resolvePdfMismatch', (t) =>
  t.field({
    type: ResolvePdfMismatchResultType,
    args: {
      articleId: t.arg.string({ required: true }),
      resolution: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via article -> session
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

      const storage = new MinioStorageService({
        endpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
        port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
        accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
        bucket: process.env.MINIO_BUCKET ?? 'cortex-pdfs',
        useSSL: process.env.MINIO_USE_SSL === 'true',
      });

      const useCase = new ResolvePdfMismatchUseCase(ctx.prisma, storage);
      return useCase.execute({
        articleId: args.articleId,
        userId: ctx.user!.id,
        resolution: args.resolution as 'ACCEPT_MISMATCH' | 'REJECT_PDF' | 'UPLOAD_CORRECT_PDF',
      }) as any;
    },
  }),
);

// --- Manual Article & Reference Mining mutations (Story 2.12) ---

builder.mutationField('addManualArticle', (t) =>
  t.field({
    type: ManualArticleResultType,
    args: {
      sessionId: t.arg.string({ required: true }),
      title: t.arg.string({ required: true }),
      authors: t.arg({ type: 'JSON', required: true }),
      year: t.arg.int({ required: false }),
      journal: t.arg.string({ required: false }),
      doi: t.arg.string({ required: false }),
      pmid: t.arg.string({ required: false }),
      pdfStorageKey: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new AddManualArticleUseCase(ctx.prisma);
      return useCase.execute({
        sessionId: args.sessionId,
        userId: ctx.user!.id,
        metadata: {
          title: args.title,
          authors: args.authors as Array<{ firstName: string; lastName: string }>,
          year: args.year ?? null,
          journal: args.journal ?? null,
          doi: args.doi ?? null,
          pmid: args.pmid ?? null,
        },
        pdfStorageKey: args.pdfStorageKey,
      }) as any;
    },
  }),
);

builder.mutationField('launchReferenceMining', (t) =>
  t.field({
    type: MineReferencesResultType,
    args: {
      sessionId: t.arg.string({ required: true }),
      articleIds: t.arg.stringList({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const redis = getRedis();
      const enqueueJob = async (queue: string, data: Record<string, unknown>) => {
        await redis.publish(
          'task:enqueued',
          JSON.stringify({
            taskId: data.taskId,
            type: queue,
            status: 'PENDING',
            metadata: data,
            createdBy: data.userId,
          }),
        );
        return data.taskId as string;
      };

      const useCase = new MineReferencesUseCase(ctx.prisma, enqueueJob);
      return useCase.execute({
        sessionId: args.sessionId,
        articleIds: args.articleIds,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('approveMinedReference', (t) =>
  t.field({
    type: ApproveReferenceResultType,
    args: {
      referenceId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via reference -> session
      const reference = await ctx.prisma.minedReference.findUnique({
        where: { id: args.referenceId },
      });

      if (!reference) {
        throw new NotFoundError('MinedReference', args.referenceId);
      }

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: reference.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', reference.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new ApproveMinedReferenceUseCase(ctx.prisma);
      return useCase.approve({
        referenceId: args.referenceId,
        userId: ctx.user!.id,
      }) as any;
    },
  }),
);

builder.mutationField('rejectMinedReference', (t) =>
  t.field({
    type: ApproveReferenceResultType,
    args: {
      referenceId: t.arg.string({ required: true }),
      reason: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Check project membership via reference -> session
      const reference = await ctx.prisma.minedReference.findUnique({
        where: { id: args.referenceId },
      });

      if (!reference) {
        throw new NotFoundError('MinedReference', args.referenceId);
      }

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: reference.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', reference.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      const useCase = new ApproveMinedReferenceUseCase(ctx.prisma);
      return useCase.reject({
        referenceId: args.referenceId,
        userId: ctx.user!.id,
        reason: args.reason,
      }) as any;
    },
  }),
);

builder.mutationField('bulkApproveMinedReferences', (t) =>
  t.field({
    type: BulkApproveResultType,
    args: {
      referenceIds: t.arg.stringList({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      // Batch-fetch all references and their sessions to avoid N+1 queries
      const references = await ctx.prisma.minedReference.findMany({
        where: { id: { in: args.referenceIds } },
      });

      if (references.length === 0) {
        return { approvedCount: 0, totalRequested: args.referenceIds.length } as any;
      }

      const sessionIds = [...new Set(references.map((r: any) => r.sessionId))] as string[];
      const sessions = await ctx.prisma.slsSession.findMany({
        where: { id: { in: sessionIds } },
      });
      const sessionMap = new Map(sessions.map((s) => [s.id, s]));

      // Validate project membership once per unique project
      const projectIds = [...new Set(sessions.map((s) => s.projectId))];
      for (const projectId of projectIds) {
        await checkProjectMembership(ctx, projectId);
      }

      const useCase = new ApproveMinedReferenceUseCase(ctx.prisma);
      let approvedCount = 0;

      for (const reference of references) {
        const session = sessionMap.get(reference.sessionId);
        if (!session) continue;

        try {
          await useCase.approve({ referenceId: reference.id, userId: ctx.user!.id });
          approvedCount++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          const { logger } = await import('../../../shared/utils/logger.js');
          logger.warn(
            { referenceId: reference.id, error: msg },
            'Failed to approve mined reference',
          );
        }
      }

      return {
        approvedCount,
        totalRequested: args.referenceIds.length,
      } as any;
    },
  }),
);

// --- Delete SLS Session ---

builder.mutationField('deleteSlsSession', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      sessionId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'sls', 'write');

      const session = await ctx.prisma.slsSession.findUnique({
        where: { id: args.sessionId },
      });

      if (!session) {
        throw new NotFoundError('SlsSession', args.sessionId);
      }

      await checkProjectMembership(ctx, session.projectId);

      if (session.status === 'LOCKED') {
        throw new ValidationError('Cannot delete a locked SLS session');
      }

      await ctx.prisma.$transaction([
        ctx.prisma.minedReference.deleteMany({ where: { sessionId: args.sessionId } }),
        (ctx.prisma as any).customAiFilter.deleteMany({ where: { sessionId: args.sessionId } }),
        ctx.prisma.exclusionCode.deleteMany({ where: { sessionId: args.sessionId } }),
        (ctx.prisma as any).queryExecution.deleteMany({
          where: { query: { sessionId: args.sessionId } },
        }),
        ctx.prisma.article.deleteMany({ where: { sessionId: args.sessionId } }),
        ctx.prisma.slsQuery.deleteMany({ where: { sessionId: args.sessionId } }),
        ctx.prisma.slsSession.delete({ where: { id: args.sessionId } }),
      ]);

      return true;
    },
  }),
);
