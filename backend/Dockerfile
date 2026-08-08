## Backend (NestJS) — obraz produkcyjny wieloetapowy.
## Build:  docker build -t optimatic-mes-backend ./backend
## Run:    patrz docker/docker-compose.prod.yml (wymaga zmiennych z .env.example)

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

# Nie root — kontener nie powinien działać jako root na produkcji.
RUN addgroup -S mes && adduser -S mes -G mes

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

USER mes
EXPOSE 3001

# Health-check trafia w /health/live — patrz src/health (nie wymaga DB, tylko żywotność procesu).
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3001)+'/health/live', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main"]
