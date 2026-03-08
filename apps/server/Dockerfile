FROM node:24-alpine AS build
WORKDIR /app

COPY package.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/admin/package.json apps/admin/package.json
RUN npm install

COPY . .
RUN npm run prisma:generate -w @discordvip/server
RUN npm run build -w @discordvip/server

FROM node:24-alpine
WORKDIR /app

COPY --from=build /app /app
WORKDIR /app/apps/server
EXPOSE 3000
CMD ["sh", "-c", "npm run prisma:generate && npm run prisma:push && npm run seed && npm run start"]
