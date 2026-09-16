#!/usr/bin/env bash
# ============================================================
# install-datastores.sh — restore the rootless Postgres 17 +
# Redis install after a sandbox reset (wipes ~/pg-install).
# Replicates the pg-migration-1 procedure: apt download +
# dpkg -x into ~/pg-install/rootfs (no sudo required), then
# initdb a fresh cluster at ~/pgdata (user nexura, trust).
# Usage: bash scripts/install-datastores.sh [--no-start]
# ============================================================
set -eu
ROOTFS="$HOME/pg-install/rootfs"
DEBS="$HOME/pg-install/debs"
mkdir -p "$DEBS" "$ROOTFS"

# ---------- collect the recursive dependency closure ----------
pkgs="postgresql-17 postgresql-client-17 redis-server redis-tools"
echo "[1/4] resolving dependency closure for: $pkgs"
all_deps="$(apt-cache depends --recurse --no-recommends --no-suggests \
  --no-conflicts --no-breaks --no-replaces --no-enhances \
  $pkgs 2>/dev/null | rg '^\w' | sort -u | rg -v '^(gdisk|udev|systemd|debconf|dpkg|install-info|adduser|passwd|sysvinit|init-system-helpers|libc6|libgcc|gcc-|perl-base|tar|gzip)$' || true)"
# libc6 etc. are always present in the sandbox; skip base system packages.

echo "[2/4] downloading debs"
cd "$DEBS"
for p in $all_deps; do
  [ -f "$p"*.deb 2>/dev/null ] || apt-get download "$p" >/dev/null 2>&1 || true
done
ls *.deb 2>/dev/null | wc -l | xargs echo "  downloaded:"

echo "[3/4] extracting to rootfs"
for f in *.deb; do
  dpkg -x "$f" "$ROOTFS" >/dev/null 2>&1 || echo "  WARN: extract failed: $f"
done

# ---------- verify binaries ----------
export LD_LIBRARY_PATH="$ROOTFS/usr/lib/x86_64-linux-gnu:$ROOTFS/usr/lib/llvm-19/lib:${LD_LIBRARY_PATH:-}"
PG_BIN="$(ls -d "$ROOTFS"/usr/lib/postgresql/*/bin 2>/dev/null | head -1)"
[ -x "$PG_BIN/initdb" ] || { echo "FATAL: initdb not found in $PG_BIN" >&2; exit 1; }
"$PG_BIN/postgres" --version
[ -x "$ROOTFS/usr/bin/redis-server" ] && "$ROOTFS/usr/bin/redis-server" --version

# ---------- fresh cluster ----------
if [ "${1:-}" != "--no-start" ]; then
  PGDATA="$HOME/pgdata"
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "[4/4] initdb at $PGDATA"
    mkdir -p "$PGDATA"
    "$PG_BIN/initdb" -D "$PGDATA" -U nexura --auth=trust --no-locale --encoding=UTF8 >/dev/null
  fi
  "$PG_BIN/pg_ctl" -D "$PGDATA" -l "$PGDATA/pg.log" -o "-p 5432 -k /tmp" start
  for _ in $(seq 1 15); do
    "$PG_BIN/pg_isready" -h 127.0.0.1 -p 5432 -t 2 >/dev/null 2>&1 && break
    sleep 1
  done
  "$PG_BIN/pg_isready" -h 127.0.0.1 -p 5432 -t 2
  "$PG_BIN/psql" -h 127.0.0.1 -p 5432 -U nexura -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname='nexura'" | grep -q 1 \
    || "$PG_BIN/psql" -h 127.0.0.1 -p 5432 -U nexura -d postgres -c "CREATE DATABASE nexura"
  echo "postgres: READY (db nexura)"
  "$ROOTFS/usr/bin/redis-server" --bind 127.0.0.1 --port 6379 --daemonize yes --save "" --appendonly no --dir /tmp
  sleep 1
  "$ROOTFS/usr/bin/redis-cli" -h 127.0.0.1 -p 6379 ping
  echo "redis: READY"
fi
echo "install-datastores: DONE"
