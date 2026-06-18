FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@11.7.0 --activate
WORKDIR /repo
ENV CI=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json nx.json ./
COPY apps/api/package.json apps/api/tsconfig.json apps/api/
COPY libs libs

RUN pnpm install --frozen-lockfile
COPY apps/api/src apps/api/src
RUN pnpm -C apps/api build

FROM node:22-alpine AS runtime
WORKDIR /repo/apps/api
ENV NODE_ENV=production

COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/apps/api/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/main.js"]
