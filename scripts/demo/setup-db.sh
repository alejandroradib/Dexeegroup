#!/usr/bin/env bash
# Local Supabase-compatible Postgres for demos (no Docker, no network).
# Idempotent: initdb once, start the server if needed, create roles/stubs/database once,
# apply migrations + seed + question banks once. Re-runs only make sure the server is up.
#
#   bash scripts/demo/setup-db.sh           # ensure running and seeded
#   bash scripts/demo/setup-db.sh --reset   # drop the dexee database and rebuild it
#   bash scripts/demo/setup-db.sh --stop    # stop the server
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGDATA="$ROOT/.demo/pgdata"
PGSOCK="$ROOT/.demo/pgsock"
PGLOG="$ROOT/.demo/postgres.log"
PGPORT="${DEMO_PG_PORT:-54329}"
PGHOST=127.0.0.1
DBNAME=dexee
PSQL="$PGBIN/psql -v ON_ERROR_STOP=1 -X -q -h $PGHOST -p $PGPORT -U postgres"

RESET=0
STOP=0
for arg in "$@"; do
  case "$arg" in
    --reset) RESET=1 ;;
    --stop) STOP=1 ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

# Run a command as the postgres OS user (initdb/pg_ctl refuse to run as root).
as_pg() {
  if [ "$(id -u)" = "0" ]; then
    setpriv --reuid=postgres --regid=postgres --clear-groups env HOME=/var/lib/postgresql "$@"
  else
    "$@"
  fi
}

mkdir -p "$ROOT/.demo" "$PGSOCK"
touch "$PGLOG"
if [ "$(id -u)" = "0" ]; then
  chown postgres:postgres "$PGSOCK" "$PGLOG"
  chmod 755 "$ROOT/.demo"
fi

is_running() {
  "$PGBIN/pg_isready" -q -h "$PGHOST" -p "$PGPORT" 2>/dev/null
}

if [ "$STOP" = "1" ]; then
  if [ -d "$PGDATA" ] && as_pg "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
    as_pg "$PGBIN/pg_ctl" -D "$PGDATA" -m fast stop
    echo "postgres stopped"
  else
    echo "postgres is not running"
  fi
  exit 0
fi

# 1. initdb ------------------------------------------------------------------
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "== initdb $PGDATA"
  mkdir -p "$PGDATA"
  [ "$(id -u)" = "0" ] && chown postgres:postgres "$PGDATA"
  chmod 700 "$PGDATA"
  as_pg "$PGBIN/initdb" -D "$PGDATA" -U postgres --auth=trust --encoding=UTF8 --locale=C.UTF-8 >/dev/null
  cat >> "$PGDATA/postgresql.conf" <<EOF

# --- dexee demo overrides ---
listen_addresses = '127.0.0.1'
port = $PGPORT
unix_socket_directories = '$PGSOCK'
max_connections = 50
shared_buffers = 64MB
fsync = off
synchronous_commit = off
full_page_writes = off
logging_collector = off
EOF
  cat > "$PGDATA/pg_hba.conf" <<EOF
local   all all                 trust
host    all all 127.0.0.1/32    trust
host    all all ::1/128         trust
EOF
fi

# 2. start -------------------------------------------------------------------
if ! is_running; then
  echo "== starting postgres on $PGHOST:$PGPORT"
  as_pg "$PGBIN/pg_ctl" -D "$PGDATA" -l "$PGLOG" -w -t 30 start >/dev/null
fi
for _ in $(seq 1 30); do
  is_running && break
  sleep 0.5
done
is_running || { echo "postgres did not come up; see $PGLOG" >&2; exit 1; }

# 3. roles (cluster-wide) ----------------------------------------------------
$PSQL -d postgres <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login noinherit; end if;
end $$;
alter role service_role bypassrls;
do $$ declare r text; begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if not exists (
      select 1 from pg_auth_members m
      join pg_roles g on g.oid = m.roleid join pg_roles u on u.oid = m.member
      where g.rolname = r and u.rolname = 'authenticator'
    ) then execute format('grant %I to authenticator', r); end if;
  end loop;
end $$;
SQL

# 4. database ----------------------------------------------------------------
if [ "$RESET" = "1" ]; then
  echo "== dropping database $DBNAME"
  $PSQL -d postgres -c "drop database if exists $DBNAME with (force)"
fi
if [ "$($PSQL -d postgres -tAc "select 1 from pg_database where datname = '$DBNAME'")" != "1" ]; then
  echo "== creating database $DBNAME"
  $PSQL -d postgres -c "create database $DBNAME"
fi

# Already migrated? (profiles is created by the first migrations)
if [ "$($PSQL -d $DBNAME -tAc "select 1 from pg_tables where schemaname = 'public' and tablename = 'profiles'")" = "1" ]; then
  $PSQL -d $DBNAME -c "notify pgrst, 'reload schema'"
  echo "database $DBNAME is ready on $PGHOST:$PGPORT (already migrated)"
  exit 0
fi

# 5. auth/storage stubs ------------------------------------------------------
echo "== creating auth/storage stubs"
$PSQL -d $DBNAME -f "$ROOT/scripts/demo/stubs.sql"

# 6. migrations --------------------------------------------------------------
for file in $(ls "$ROOT/supabase/migrations"/*.sql | sort); do
  echo "== migration $(basename "$file")"
  $PSQL -d $DBNAME -f "$file"
done

# 7. seed --------------------------------------------------------------------
echo "== seed.sql"
$PSQL -d $DBNAME -f "$ROOT/supabase/seed.sql"

echo "== question banks"
BANKS_SQL="$ROOT/.demo/banks.sql"
(cd "$ROOT" && npx tsx scripts/demo/load-banks.ts > "$BANKS_SQL")
$PSQL -d $DBNAME -f "$BANKS_SQL"

# 8. grants on everything that exists now (default privileges cover the future)
$PSQL -d $DBNAME <<'SQL'
grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant execute on all functions in schema storage to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;
grant all on all tables in schema auth to service_role;
notify pgrst, 'reload schema';
SQL

echo "database $DBNAME is ready on $PGHOST:$PGPORT"
