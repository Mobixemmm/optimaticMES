## Frontend (TanStack Start) — obraz produkcyjny wieloetapowy dla wdrożenia
## on-prem (Docker), NIE dla Cloudflare Workers (domyślny cel builda w tym
## repo — patrz vite.config.ts). Wymuszamy zwykły serwer Node przez NITRO_PRESET.
## Build:  docker build --build-arg VITE_API_URL=https://mes-api.przyklad.local -t optimatic-mes-frontend ./frontend
## Run:    patrz docker/docker-compose.prod.yml

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# `npm ci` na tym drzewie zależności (eslint 9 + zagnieżdżone ajv 6.x/8.x)
# potrafi rzucić fałszywym "lock file ... does not satisfy" mimo poprawnego,
# spójnego package-lock.json — znany klimat npm/lockfileVersion 3 z opcjonalnymi
# peer deps. `npm install` z istniejącym lockfile'em jako podstawą jest tu
# niezawodne i nadal respektuje zablokowane wersje.
RUN npm install --no-audit --no-fund
COPY . .

# VITE_API_URL jest wypiekany do bundla w czasie builda (Vite) — musi być
# publicznym adresem backendu widocznym z przeglądarki operatora, nie adresem
# wewnątrz sieci Dockera.
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=${VITE_API_URL}
ENV NITRO_PRESET=node-server
RUN npm run build

FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S mes && adduser -S mes -G mes
COPY --from=build /app/.output ./.output
USER mes

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/', r => process.exit(r.statusCode<500?0:1)).on('error', () => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
