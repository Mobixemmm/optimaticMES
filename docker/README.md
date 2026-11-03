# Wdrożenie

## Dev (baza only)

```bash
docker compose -f docker/docker-compose.yml up -d
```

Backend i frontend uruchamiasz lokalnie (`npm run start:dev` / `npm run dev`) przeciw tej bazie.

## Produkcja (on-prem)

```bash
cp docker/.env.prod.example docker/.env.prod   # uzupełnij sekrety
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.prod up -d --build

# jednorazowo po pierwszym starcie (i po każdej nowej migracji):
docker compose -f docker/docker-compose.prod.yml exec backend npm run migration:run:prod
```

Buduje i uruchamia timescaledb + backend + frontend. **Nie zawiera** reverse proxy
ani TLS — postaw przed tym nginx/traefik z certyfikatem (patrz `nginx.conf.example`
jako punkt startowy) albo oprzyj się na firewallu zakładowym. Nie wystawiaj portów
3001/8080 bezpośrednio do internetu.

`VITE_API_URL` w `docker/.env.prod` musi być adresem backendu **widocznym z
przeglądarki operatora**, nie nazwą kontenera Dockera — jest wypiekany do
frontendu w czasie budowy (Vite), więc zmiana wymaga przebudowania obrazu
frontendu (`--build`), nie tylko restartu kontenera.

## Backup bazy

```bash
./docker/backup-db.sh   # pg_dump + rotacja starych kopii (patrz zmienne w skrypcie)
```

Podepnij pod cron/Task Scheduler. Przywracanie:

```bash
docker exec -i mes_timescaledb pg_restore -U gateway -d machine_data --clean --if-exists < backup.dump
```

## Ważne przed pierwszym uruchomieniem na hali

- `SENSOR_SIMULATION` musi zostać `false` (domyślnie) — symulator temperatury
  jest tylko do dev/demo.
- `COOKIE_SECURE=true` wymaga serwowania po HTTPS (inaczej przeglądarka
  odrzuci cookie sesji i logowanie nie zadziała).
- Backend waliduje zmienne środowiskowe przy starcie (`src/config/validate-env.ts`)
  i **nie wystartuje** bez poprawnego `JWT_SECRET` ani z domyślnym/placeholderowym.
