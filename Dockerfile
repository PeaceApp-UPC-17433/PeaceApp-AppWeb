FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm test && pnpm build

FROM nginxinc/nginx-unprivileged:1.31-alpine
ENV API_UPSTREAM=http://api-gateway:8080 \
    API_URL=/api/v1
COPY deploy/security-headers.conf /etc/nginx/security-headers.conf
COPY deploy/templates/default.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/docker-entrypoint.d/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
