# ---- Base ----
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# ---- Dependencies (cached layer) ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/workers/package.json ./apps/workers/
COPY packages/shared/package.json ./packages/shared/
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config-typescript/package.json ./packages/config-typescript/
COPY packages/config-eslint/package.json ./packages/config-eslint/
COPY packages/config-tailwind/package.json ./packages/config-tailwind/
RUN pnpm install --frozen-lockfile

# ---- Build ----
FROM deps AS builder
COPY . .
RUN cd packages/prisma && npx prisma generate --schema schema/
RUN pnpm turbo build --filter=@cortex/api
# Fix workspace package exports for Node.js runtime (src/*.ts -> dist/*.js)
RUN sed -i 's|"./src/index.ts"|"./dist/index.js"|g' packages/shared/package.json

# ---- Production runner ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules/
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist/
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules/
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist/
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules/
COPY --from=builder /app/packages/prisma ./packages/prisma/

USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
