FROM node:24-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/server/prisma apps/server/prisma
RUN npm install

COPY . .
RUN npm run build -w @discordvip/admin

FROM node:24-alpine
WORKDIR /app
COPY --from=build /app /app
WORKDIR /app/apps/admin
EXPOSE 4173
CMD ["npm", "run", "preview"]
