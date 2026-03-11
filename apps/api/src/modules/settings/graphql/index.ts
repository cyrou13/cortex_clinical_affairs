import { builder } from '../../../graphql/builder.js';
import { checkPermission } from '../../../shared/middleware/rbac-middleware.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const MASK = '••••••••';

const AppSettingType = builder.objectRef<{
  id: string;
  category: string;
  key: string;
  value: string;
  encrypted: boolean;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}>('AppSetting');

builder.objectType(AppSettingType, {
  fields: (t) => ({
    id: t.exposeString('id'),
    category: t.exposeString('category'),
    key: t.exposeString('key'),
    value: t.exposeString('value'),
    encrypted: t.exposeBoolean('encrypted'),
    updatedBy: t.exposeString('updatedBy', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
});

const AppSettingsCategoryType = builder.objectRef<{
  category: string;
  settings: Array<{
    id: string;
    category: string;
    key: string;
    value: string;
    encrypted: boolean;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}>('AppSettingsCategory');

builder.objectType(AppSettingsCategoryType, {
  fields: (t) => ({
    category: t.exposeString('category'),
    settings: t.field({
      type: [AppSettingType],
      resolve: (parent) => parent.settings,
    }),
  }),
});

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

const AppSettingInput = builder.inputType('AppSettingInput', {
  fields: (t) => ({
    category: t.string({ required: true }),
    key: t.string({ required: true }),
    value: t.string({ required: true }),
    encrypted: t.boolean({ required: false }),
  }),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskIfEncrypted<T extends { encrypted: boolean; value: string }>(setting: T): T {
  if (setting.encrypted) {
    return { ...setting, value: MASK };
  }
  return setting;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

builder.queryField('appSettings', (t) =>
  t.field({
    type: [AppSettingType],
    args: {
      category: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'admin', 'read');

      const where: Record<string, unknown> = {};
      if (args.category) {
        where.category = args.category;
      }

      const settings = await (ctx.prisma as any).appSetting.findMany({
        where,
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
      });

      return settings.map(maskIfEncrypted);
    },
  }),
);

builder.queryField('appSetting', (t) =>
  t.field({
    type: AppSettingType,
    nullable: true,
    args: {
      category: t.arg.string({ required: true }),
      key: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'admin', 'read');

      const setting = await (ctx.prisma as any).appSetting.findUnique({
        where: { category_key: { category: args.category, key: args.key } },
      });

      if (!setting) return null;
      return maskIfEncrypted(setting);
    },
  }),
);

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

builder.mutationField('upsertAppSetting', (t) =>
  t.field({
    type: AppSettingType,
    args: {
      category: t.arg.string({ required: true }),
      key: t.arg.string({ required: true }),
      value: t.arg.string({ required: true }),
      encrypted: t.arg.boolean({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const setting = await (ctx.prisma as any).appSetting.upsert({
        where: { category_key: { category: args.category, key: args.key } },
        create: {
          category: args.category,
          key: args.key,
          value: args.value,
          encrypted: args.encrypted ?? false,
          updatedBy: ctx.user?.id ?? null,
        },
        update: {
          value: args.value,
          encrypted: args.encrypted ?? false,
          updatedBy: ctx.user?.id ?? null,
        },
      });

      return maskIfEncrypted(setting);
    },
  }),
);

builder.mutationField('upsertAppSettings', (t) =>
  t.field({
    type: 'Int',
    args: {
      settings: t.arg({ type: [AppSettingInput], required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      const updatedBy = ctx.user?.id ?? null;

      await Promise.all(
        args.settings.map((s) =>
          (ctx.prisma as any).appSetting.upsert({
            where: { category_key: { category: s.category, key: s.key } },
            create: {
              category: s.category,
              key: s.key,
              value: s.value,
              encrypted: s.encrypted ?? false,
              updatedBy,
            },
            update: {
              value: s.value,
              encrypted: s.encrypted ?? false,
              updatedBy,
            },
          }),
        ),
      );

      return args.settings.length;
    },
  }),
);

builder.mutationField('deleteAppSetting', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      category: t.arg.string({ required: true }),
      key: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx) => {
      checkPermission(ctx, 'soa', 'write');

      try {
        await (ctx.prisma as any).appSetting.delete({
          where: { category_key: { category: args.category, key: args.key } },
        });
        return true;
      } catch {
        return false;
      }
    },
  }),
);
