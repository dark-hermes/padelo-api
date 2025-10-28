# ---- Base ----
FROM node:22-alpine AS base
WORKDIR /usr/src/app
ENV PATH=/usr/src/app/node_modules/.bin:$PATH

# ---- Dependencies ----
FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM base AS build
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Development ----
FROM base AS development
COPY package.json package-lock.json ./
RUN npm ci
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY . .
CMD ["npx", "nest", "start", "--watch"]

# ---- Production ----
FROM base AS production
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "dist/main"]
