#!/usr/bin/env bash
# Backup bazy TimescaleDB z rotacją. Uruchamiaj cyklicznie (cron/Task Scheduler),
# np. codziennie o 2:00: 0 2 * * * /path/to/docker/backup-db.sh
#
# Wymaga uruchomionego kontenera mes_timescaledb (patrz docker-compose.prod.yml)
# i zmiennej DB_PASSWORD w środowisku, w którym uruchamiasz ten skrypt.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
CONTAINER="${TIMESCALEDB_CONTAINER:-mes_timescaledb}"
DB_NAME="${DB_NAME:-machine_data}"
DB_USER="${DB_USER:-gateway}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

echo "[backup-db] Zrzucam $DB_NAME z kontenera $CONTAINER..."
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --format=custom \
  > "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump"

echo "[backup-db] Zapisano $BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump"

echo "[backup-db] Usuwam kopie starsze niż ${RETENTION_DAYS} dni..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.dump" -mtime "+${RETENTION_DAYS}" -delete

echo "[backup-db] Gotowe."

# Przywracanie:
#   docker exec -i mes_timescaledb pg_restore -U gateway -d machine_data --clean --if-exists < backup.dump
