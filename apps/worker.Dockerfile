FROM node:22-alpine AS build
ARG WORKER=embedding-worker
RUN corepack enable && corepack prepare pnpm@11.7.0 --activate
WORKDIR /repo
ENV CI=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json nx.json ./
COPY apps/${WORKER}/package.json apps/${WORKER}/tsconfig.json apps/${WORKER}/
COPY libs libs

RUN pnpm install --frozen-lockfile
COPY apps/${WORKER}/src apps/${WORKER}/src
RUN pnpm -C apps/${WORKER} build

FROM node:22-alpine AS runtime
ARG WORKER=embedding-worker
WORKDIR /repo/apps/${WORKER}
ENV NODE_ENV=production

COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/apps/${WORKER}/dist ./dist
COPY --from=build /repo/apps/${WORKER}/package.json ./package.json
COPY --from=build /repo/apps/${WORKER}/node_modules ./node_modules

EXPOSE 9100
CMD ["node", "dist/main.js"]
