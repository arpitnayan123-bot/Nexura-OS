#!/usr/bin/env bash
# ============================================================
# ensure-datastores.sh — boot local Postgres/Redis when needed
#
# Nexura's production configuration is Postgres + Redis. In the
# sandbox (and on a single VPS without systemd) the daemons are
# NOT supervised by init — a platform restart leaves them down
# while .env still points at loopback. This script:
#
#   1. Reads DATABASE_URL / REDIS_URL from .env (env exports the
#      source of truth; see guardian heal_env).
#   2. If a URL points at a MANAGED host (anything not loopback),
#      it is a no-op — operations owns that service.
#   3. If a URL points at loopback, it verifies the daemon with
#      pg_isready / redis-cli and starts the local binaries if
#      they are down (searching PATH plus known sandbox install
#      locations). A missing local database is created once.
#
# Exit 0 unless a loopback datastore could not be brought up.
# ============================================================
set -u
ROOT="/home/z/my-project"
cd "$ROOT" || exit 1
[ -f .env ] && . ./.env 2>/dev/null

url_host() { # extract hostname from a standard URL
  printf '%s' "${1:-}" | sed -E 's|^[a-zA-Z0-9+.-]+://||; s|@[^/?#]*@|@|; s|.*@||; s|[/:?#].*||'
}

is_loopback() {
  case "$1" in
    localhost|127.0.0.1|::1|0.0.0.0) return 0 ;;
    *) return 1 ;;
  esac
}

find_bin() { # $1=bin name, $2...=extra search dirs; prints first hit
  local b="$1"; shift
  if command -v "$b" >/dev/null 2>&1; then command -v "$b"; return 0; fi
  local d
  for d in "$@"; do
    [ -x "$d/$b" ] && { echo "$d/$b"; return 0; }
  done
  return 1
}

PG_BIN_DIRS=(/usr/lib/postgresql/*/bin "$HOME"/pg-install/rootfs/usr/lib/postgresql/*/bin)
REDIS_LIB_DIR="$HOME/pg-install/rootfs/usr/lib/x86_64-linux-gnu"
# Sandboxed redis binaries link against libs extracted next to them
# (liblzf et al.); system installs resolve from ldconfig as usual.
# export is mandatory — a plain assignment never reaches the daemons.
[ -d "$REDIS_LIB_DIR" ] && export LD_LIBRARY_PATH="${REDIS_LIB_DIR}${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
rc=0

# ---------- PostgreSQL ----------
pg_host="$(url_host "${DATABASE_URL:-}")"
if [ -n "$pg_host" ] && is_loopback "$pg_host"; then
  pg_isready_bin="$(find_bin pg_isready "${PG_BIN_DIRS[@]}" 2>/dev/null || true)"
  pg_ctl_bin="$(find_bin pg_ctl "${PG_BIN_DIRS[@]}" 2>/dev/null || true)"
  if [ -z "$pg_isready_bin" ] || [ -z "$pg_ctl_bin" ]; then
    echo "ensure-datastores: pg binaries not found; set DATABASE_URL to a reachable Postgres" >&2
    rc=1
  elif "$pg_isready_bin" -h "$pg_host" -p 5432 -t 2 >/dev/null 2>&1; then
    : # already up
  else
    PGDATA="${PGDATA:-$HOME/pgdata}"
    if [ ! -f "$PGDATA/PG_VERSION" ]; then
      initdb_bin="$(find_bin initdb "${PG_BIN_DIRS[@]}" 2>/dev/null || true)"
      [ -n "$initdb_bin" ] && mkdir -p "$PGDATA" \
        && "$initdb_bin" -D "$PGDATA" -U nexura --auth=trust --no-locale --encoding=UTF8 >> "$ROOT/logs/datastores.log" 2>&1
    fi
    if [ -f "$PGDATA/PG_VERSION" ]; then
      echo "ensure-datastores: starting local PostgreSQL at $PGDATA"
      "$pg_ctl_bin" -D "$PGDATA" -l "$PGDATA/pg.log" -o "-p 5432 -k /tmp" start >> "$ROOT/logs/datastores.log" 2>&1
      for _ in $(seq 1 15); do
        "$pg_isready_bin" -h "$pg_host" -p 5432 -t 2 >/dev/null 2>&1 && break
        sleep 1
      done
    fi
    # one-time database creation on a fresh cluster
    psql_bin="$(find_bin psql "${PG_BIN_DIRS[@]}" 2>/dev/null || true)"
    pg_db="$(printf '%s' "${DATABASE_URL:-}" | sed -E 's|.*/|\1|; s|\?.*||')"
    if [ -n "$psql_bin" ] && [ -n "$pg_db" ]; then
      "$psql_bin" -h "$pg_host" -p 5432 -U nexura -d postgres -tAc \
        "SELECT 1 FROM pg_database WHERE datname='$pg_db'" 2>/dev/null | grep -q 1 \
        || "$psql_bin" -h "$pg_host" -p 5432 -U nexura -d postgres -c "CREATE DATABASE $pg_db" >> "$ROOT/logs/datastores.log" 2>&1
    fi
    "$pg_isready_bin" -h "$pg_host" -p 5432 -t 2 >/dev/null 2>&1 || { echo "ensure-datastores: FAILED to start PostgreSQL" >&2; rc=1; }
  fi
fi

# ---------- Redis ----------
rd_host="$(url_host "${REDIS_URL:-}")"
if [ -n "$rd_host" ] && is_loopback "$rd_host"; then
  redis_cli="$(find_bin redis-cli "$HOME/pg-install/rootfs/usr/bin" 2>/dev/null || true)"
  redis_srv="$(find_bin redis-server "$HOME/pg-install/rootfs/usr/bin" 2>/dev/null || true)"
  if [ -z "$redis_srv" ]; then
    echo "ensure-datastores: redis-server not found; set REDIS_URL to a reachable Redis" >&2
    rc=1
  elif [ -n "$redis_cli" ] && "$redis_cli" -h "$rd_host" -p 6379 ping >/dev/null 2>&1; then
    : # already up
  else
    echo "ensure-datastores: starting local Redis on :6379"
    "$redis_srv" --bind 127.0.0.1 --port 6379 --daemonize yes --save "" --appendonly no --dir /tmp >> "$ROOT/logs/datastores.log" 2>&1
    sleep 1
    [ -n "$redis_cli" ] && "$redis_cli" -h "$rd_host" -p 6379 ping >/dev/null 2>&1 \
      || { echo "ensure-datastores: FAILED to start Redis" >&2; rc=1; }
  fi
fi

exit $rc
