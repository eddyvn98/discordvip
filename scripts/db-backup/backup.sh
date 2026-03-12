#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-discordvip}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
filename="${BACKUP_DIR}/${POSTGRES_DB}-${timestamp}.sql.gz"

echo "[db-backup] starting backup at ${timestamp} (UTC)"
PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges | gzip -9 > "$filename"

echo "[db-backup] backup saved to $filename"

find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +"$RETENTION_DAYS" -print -delete
echo "[db-backup] retention cleanup complete (>${RETENTION_DAYS} days)"
