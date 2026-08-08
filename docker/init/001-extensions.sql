-- Uruchamiane raz, przy pierwszym utworzeniu kontenera (docker-entrypoint-initdb.d).
-- Sam schemat aplikacji (tabele, hypertables) tworzą migracje TypeORM
-- (`npm run migration:run` w backend/) — jedyne źródło prawdy dla schematu.
-- Tu tylko włączamy rozszerzenie, żeby obraz timescaledb/timescaledb był gotowy.
CREATE EXTENSION IF NOT EXISTS timescaledb;
