#!/usr/bin/env bash
# Aplica el shim + migraciones en una base de datos temporal y ejecuta la historia.
# Uso: PGHOST=... PGPORT=... PGUSER=postgres ./supabase/tests/run_local.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB="yuin_test_$$"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/local_shim.sql
for f in migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"
done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/story_test.sql -o /dev/null 2>&1 | sed -E "s/^psql:[^ ]+ (NOTICE|ERROR):  //"
