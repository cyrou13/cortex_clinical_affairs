# ---- Base ----
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

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
# Build workspace deps (shared, ui) via turbo, then vite build (skips tsc)
RUN pnpm turbo build --filter=@cortex/shared --filter=@cortex/ui
RUN cd apps/web && npx vite build

# ---- Nginx runner ----
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
