#!/usr/bin/env bash
# Logical backup of the database (M6 runbook). Uses the direct (unpooled) URL when available.
#   DATABASE_URL_UNPOOLED=postgres://... ./scripts/db-backup.sh [output-dir]
set -euo pipefail
URL="${DATABASE_URL_UNPOOLED:-${DATABASE_URL:?Set DATABASE_URL or DATABASE_URL_UNPOOLED}}"
OUT_DIR="${1:-backups}"
mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/comfort-kwaw-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_dump --format=custom --no-owner --no-privileges --dbname="$URL" --file="$FILE"
echo "Backup written: $FILE ($(du -h "$FILE" | cut -f1))"
