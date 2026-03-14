FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/server/prisma apps/server/prisma
RUN npm install --workspace @discordvip/server --include-workspace-root=false

COPY apps/server apps/server
RUN npm run prisma:generate -w @discordvip/server
RUN npm run build -w @discordvip/server

FROM node:24-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/server/tsconfig.json apps/server/tsconfig.json
COPY apps/server/prisma apps/server/prisma
RUN npm install --workspace @discordvip/server --include-workspace-root=false --no-audit --no-fund \
  && npm cache clean --force

COPY --from=build /app/apps/server/dist /app/apps/server/dist
WORKDIR /app/apps/server
EXPOSE 3000
CMD ["npm", "run", "start:container"]
