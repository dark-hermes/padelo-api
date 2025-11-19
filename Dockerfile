FROM node:22-alpine AS base
RUN apk add --no-cache git bash curl python3 make g++
WORKDIR /usr/src/app
RUN npm i -g pnpm

# ---- Prod Dependencies Stage ----
FROM base AS prod_dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# ---- Builder Stage ----
FROM base AS builder
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Generate Prisma Client in builder with a harmless dummy DATABASE_URL to satisfy env resolution at build time.
# This value is used only during build and does not persist to the final image.
RUN DATABASE_URL="postgresql://user:pass@localhost:5432/devdb?schema=public" pnpm exec prisma generate
RUN pnpm build

# ---- Development Stage ----
FROM base AS development
ENV PATH=/usr/src/app/node_modules/.bin:$PATH
WORKDIR /usr/src/app
CMD ["tail", "-f", "/dev/null"]

# ---- Production Stage ----
FROM base AS production
ENV NODE_ENV=production
# Provide optional build ARG for DATABASE_URL (not persisted) in case generate is re-run manually
ARG DATABASE_URL
ENV DATABASE_URL=

# Copy only what we need from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY package.json .
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Do NOT run prisma generate here; rely on builder output plus runtime entrypoint safety net.
# This avoids pnpm store path duplication and ensures single source of generated client.

EXPOSE 3000

ENTRYPOINT ["/usr/src/app/docker-entrypoint.sh"]
# The compiled NestJS output lives under dist/src/main.js in this project layout
CMD ["node", "dist/src/main.js"]
