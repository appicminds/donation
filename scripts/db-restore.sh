#!/usr/bin/env bash
# Restore a backup into an EMPTY target database (never the live one by accident).
#   TARGET_DATABASE_URL=postgres://.../restore_test ./scripts/db-restore.sh backups/comfort-kwaw-....dump
set -euo pipefail
FILE="${1:?Pass the .dump file to restore}"
TARGET="${TARGET_DATABASE_URL:?Set TARGET_DATABASE_URL to an empty database}"
TABLES=$(psql "$TARGET" -tAc "select count(*) from information_schema.tables where table_schema='public'")
if [ "$TABLES" != "0" ]; then
  echo "Refusing: target database is not empty ($TABLES tables)." >&2
  exit 1
fi
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$TARGET" "$FILE"
echo "Restored $FILE into target database."
