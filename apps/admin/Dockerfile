FROM node:24-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ARG VITE_ENABLE_DEBUG_LOGIN=false
ENV VITE_ENABLE_DEBUG_LOGIN=${VITE_ENABLE_DEBUG_LOGIN}

COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY apps/admin/package.json apps/admin/package.json
RUN npm install --workspace @discordvip/admin --include-workspace-root=false

COPY apps/admin apps/admin
RUN npm run build -w @discordvip/admin

FROM nginx:1.27-alpine
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
RUN printf "server {\n  listen 4173;\n  server_name _;\n  root /usr/share/nginx/html;\n  index index.html;\n\n  location /assets/ {\n    try_files \$uri =404;\n    expires 1y;\n    add_header Cache-Control \"public, max-age=31536000, immutable\";\n  }\n\n  location = /index.html {\n    add_header Cache-Control \"no-cache\";\n  }\n\n  location / {\n    try_files \$uri \$uri/ /index.html;\n  }\n}\n" > /etc/nginx/conf.d/default.conf
EXPOSE 4173
CMD ["nginx", "-g", "daemon off;"]
