ARG LOGGING_OPTION=CLOUD_LOGGING_ONLY
FROM node:18-alpine AS base

FROM base AS setup
RUN apk add --no-cache libc6-compat # https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
RUN apk update && apk upgrade && apk add dumb-init && adduser -D rembouser
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./

FROM setup AS deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm db:generate
RUN pnpm build

FROM setup AS prod
COPY --from=build --chown=rembouser:rembouser /app/dist .
COPY --from=build --chown=rembouser:rembouser /app/node_modules ./node_modules
USER rembouser
HEALTHCHECK --interval=60s --retries=5 CMD curl --fail http://localhost/ || exit 1
EXPOSE 3000
ENV HOST=0.0.0.0 PORT=3000 NODE_ENV=production
CMD ["dumb-init","node","index.js"]
