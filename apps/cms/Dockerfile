# Multi-stage build for the KUASAR Strapi CMS.
#
# The admin panel compile is the memory spike that OOMs Render Starter's 512 MB
# (docs/adr/0002-cms.md decision 4). It happens HERE, on a CI runner with real memory.
# The runtime image only runs `strapi start` against the prebuilt admin — it never
# compiles anything.
#
# Build context is the REPOSITORY ROOT (npm workspaces), not apps/cms:
#   docker build -f apps/cms/Dockerfile .

# ---------- Stage 1: build the admin + server bundle ----------
FROM node:24-bookworm-slim AS build

ENV NODE_ENV=production
# node-gyp / sharp build deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

# Install with the lockfile first, for layer caching. Every workspace's package.json
# must be present for npm to resolve the workspace tree; only apps/cms's source follows.
COPY package.json package-lock.json ./
COPY apps/cms/package.json apps/cms/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace apps/cms --include-workspace-root

# Then the source and the actual build.
COPY apps/cms apps/cms
WORKDIR /repo/apps/cms
# Give `strapi build` enough heap; this is the step that OOMs on a small box.
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Prebuilt node_modules, config, compiled server (dist/) and admin (build/).
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/cms ./

RUN chown -R node:node /app
USER node

EXPOSE 1337
ENV HOST=0.0.0.0 PORT=1337

# `strapi start` — no build, no compile.
CMD ["npm", "run", "start"]
