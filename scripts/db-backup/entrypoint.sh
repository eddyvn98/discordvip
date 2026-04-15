#!/bin/sh
set -eu

BACKUP_CRON="${BACKUP_CRON:-0 3 * * *}"
CRON_FILE="/etc/crontabs/root"

mkdir -p /backups

cat > "$CRON_FILE" <<EOF
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
${BACKUP_CRON} /bin/sh /scripts/backup.sh >> /proc/1/fd/1 2>> /proc/1/fd/2
EOF

echo "[db-backup] cron schedule: ${BACKUP_CRON}"
echo "[db-backup] running initial backup on startup"
/bin/sh /scripts/backup.sh

echo "[db-backup] cron daemon started"
exec crond -f -l 2