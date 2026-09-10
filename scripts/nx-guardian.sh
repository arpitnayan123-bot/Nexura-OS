#!/usr/bin/env bash
# ============================================================
# NEXURA GUARDIAN — self-healing production boot & watchdog
#
# Why this exists: sandbox resets kill processes and wipe .env.
# A blind "serve .next/standalone" then fails forever (no secret,
# stale/missing bundle, unsynced static assets) and the preview
# goes down until a human notices. This guardian makes the boot
# entry point heal the whole chain, every cycle:
#
#   1. Heals .env           — regenerates JWT_SECRET (CSPRNG) if
#                             missing/short; preserves DATABASE_URL.
#   2. Builds if stale      — runs `next build` when the standalone
#                             bundle is missing OR any file under
#                             src/ or prisma/ is newer than BUILD_ID.
#   3. Syncs static assets  — .next/static + public/ into standalone
#                             (Next.js never copies these itself).
#   4. Kills stale listeners— next-server renames its process title,
#                             so blind pkill misses it; we match it.
#   5. Serves + watches     — statics are re-synced on EVERY boot (a
#                             fresh standalone always needs the copy);
#                             restarts the server if it dies; health
#                             check every 20s covers BOTH the API and
#                             the first CSS chunk referenced by the
#                             homepage (catches unsynced/stale statics
#                             that an API-only probe never sees);
#                             3 consecutive failures or source drift
#                             -> heal + rebuild cycle.
#
# Single-instance via pid-file (flock is NOT guaranteed in minimal
# sandboxes). Logs to logs/guardian.log.
# ============================================================

set -u
ROOT="/home/z/my-project"
PORT=3000
LOG="$ROOT/logs/guardian.log"
PIDFILE="/tmp/.nx-guardian.pid"

mkdir -p "$ROOT/logs"

# --- single instance: pid-file + liveness check -----------------
if [ -f "$PIDFILE" ]; then
  OLD="$(cat "$PIDFILE" 2>/dev/null || true)"
  if [ -n "$OLD" ] && kill -0 "$OLD" 2>/dev/null; then
    echo "[$(date -u +%FT%TZ)] guardian: instance $OLD already running — exiting" >> "$LOG"
    exit 0
  fi
  rm -f "$PIDFILE"
fi
echo $$ > "$PIDFILE"
# orphaned subshells (health loops) of a dead instance share our cmdline;
# sweep them so two guardians never fight over :3000
for p in $(pgrep -f "bash scripts/nx-guardian.sh" 2>/dev/null); do
  if [ "$p" != "$$" ] && [ "$p" != "$PPID" ]; then kill -9 "$p" 2>/dev/null || true; fi
done

log() { echo "[$(date -u +%FT%TZ)] $*" >> "$LOG"; }

heal_db() {
  # A sandbox reset can leave the SQLite file pristine (schema, no rows).
  # A hospital preview with zero hospitals is a dead preview — reseed ONCE,
  # only when the database is completely empty. Never touches existing data.
  cd "$ROOT" || return 1
  local count
  count="$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.hospital.count().then(c=>{console.log(c);return p.\$disconnect()}).catch(()=>console.log('err'))" 2>/dev/null)"
  if [ "$count" = "0" ]; then
    log "db: empty database detected — running full seed chain"
    npm run seed:all >> "$LOG" 2>&1 \
      && bun scripts/seed-nx-v5.ts >> "$LOG" 2>&1 \
      && log "db: seed chain complete"
  fi
}

heal_env() {
  cd "$ROOT" || return 1
  if [ ! -f .env ]; then : > .env; fi
  local need_write=0
  # DATABASE_URL must exist
  if ! grep -q "^DATABASE_URL=" .env; then
    echo "DATABASE_URL=file:$ROOT/db/custom.db" >> .env
    log "env: restored missing DATABASE_URL"
    need_write=1
  fi
  # JWT_SECRET must exist and be >= 16 chars
  local cur
  cur="$(grep -E '^JWT_SECRET=' .env | head -1 | cut -d= -f2-)"
  if [ -z "$cur" ] || [ "${#cur}" -lt 16 ]; then
    local secret
    secret="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n')"
    # drop any short/empty line, append fresh secret
    grep -v '^JWT_SECRET=' .env > .env.tmp 2>/dev/null || true
    mv .env.tmp .env
    echo "JWT_SECRET=$secret" >> .env
    log "env: regenerated JWT_SECRET (${#cur} chars -> ${#secret} chars)"
    need_write=1
  fi
  # DEMO_MODE for preview surfaces
  if ! grep -q "^DEMO_MODE=" .env; then
    echo "DEMO_MODE=true" >> .env
    log "env: set DEMO_MODE=true"
  fi
  return 0
}

build_stale() {
  # true when bundle missing or any source file newer than the served BUILD_ID.
  # NOTE: with output:standalone the copy lives at .next/standalone/.next/BUILD_ID
  # (not .next/standalone/BUILD_ID) — checking the wrong path made every
  # restart look stale and forced a needless 40s rebuild.
  if [ ! -f "$ROOT/.next/standalone/.next/BUILD_ID" ]; then
    return 0
  fi
  if [ -n "$(find "$ROOT/src" "$ROOT/prisma" -type f -newer "$ROOT/.next/standalone/.next/BUILD_ID" -print -quit 2>/dev/null)" ]; then
    return 0
  fi
  return 1
}

sync_statics() {
  cd "$ROOT" || return 1
  [ -d .next/standalone ] || return 1
  mkdir -p .next/standalone/.next
  rm -rf .next/standalone/.next/static
  cp -r .next/static .next/standalone/.next/static 2>>"$LOG" || true
  rm -rf .next/standalone/public
  cp -r public .next/standalone/public 2>>"$LOG" || true
}

kill_stale_listeners() {
  # next-server renames its process title — match BOTH patterns.
  pkill -f "next-server" 2>/dev/null && log "watchdog: killed stale next-server listener"
  pkill -f "standalone/server\.js" 2>/dev/null && log "watchdog: killed stale standalone server"
  # never let an old supervisor fight the guardian
  pkill -f "nx-supervisor\.sh" 2>/dev/null && log "watchdog: killed legacy supervisor"
  sleep 1
}

do_build() {
  cd "$ROOT" || return 1
  log "build: starting (stale or missing bundle)"
  if npx next build >> "$LOG" 2>&1; then
    sync_statics
    log "build: OK + statics synced"
    return 0
  fi
  log "build: FAILED — will retry next cycle"
  return 1
}

SERVER_PID=""
health_failures=0

# Full-surface probe: the API being up proves nothing about static
# assets (this Next version snapshots .next/static at boot). A homepage
# that returns 200 but whose CSS chunk 404s IS an outage (unstyled
# preview), so the probe checks the API AND the first referenced CSS.
probe_healthy() {
  curl -fs -o /dev/null "http://127.0.0.1:$PORT/api/nx/system-status" --max-time 8 || return 1
  local css code
  css="$(curl -fs --max-time 8 "http://127.0.0.1:$PORT/" 2>/dev/null | grep -oE '/_next/static/[^"]+\.css' | head -1)"
  [ -n "$css" ] || return 1
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "http://127.0.0.1:$PORT$css")"
  [ "$code" = "200" ]
}

health_loop() {
  # checks every 20s while the server runs; kills it after 3 fails,
  # and rebuilds if source drift is detected (checked every 10 min)
  local ticks=0
  while kill -0 "$SERVER_PID" 2>/dev/null; do
    sleep 20
    kill -0 "$SERVER_PID" 2>/dev/null || break
    ticks=$((ticks + 1))
    if probe_healthy; then
      health_failures=0
    else
      health_failures=$((health_failures + 1))
      log "health: FAIL ($health_failures/3)"
      if [ "$health_failures" -ge 3 ]; then
        log "health: 3 consecutive failures — restarting server (statics resync on boot)"
        kill -9 "$SERVER_PID" 2>/dev/null
        return
      fi
    fi
    if [ $((ticks % 30)) -eq 0 ]; then
      if build_stale; then
        log "watchdog: source drift detected — restarting to rebuild"
        kill -9 "$SERVER_PID" 2>/dev/null
        return
      fi
    fi
  done
}

log "guardian: boot (pid $$)"

# main supervise loop
while true; do
  heal_env || { log "env heal failed; retry in 5s"; sleep 5; continue; }
  heal_db

  if build_stale; then
    kill_stale_listeners
    do_build || { sleep 10; continue; }
  fi

  kill_stale_listeners
  # ALWAYS re-sync statics before serving: next build (manual or via
  # do_build) recreates .next/standalone without .next/static or public/,
  # and a running server never picks up late copies — serving without
  # this step is exactly how "unstyled preview + 404 chunks" happens.
  sync_statics || { log "static sync failed; standalone missing — rebuilding"; kill_stale_listeners; do_build || { sleep 10; continue; }; }

  cd "$ROOT/.next/standalone" || { log "standalone dir missing; rebuilding"; sleep 2; continue; }
  log "serve: starting server on :$PORT (statics synced)"
  NODE_ENV=production PORT=$PORT HOSTNAME=0.0.0.0 NX_PROJECT_ROOT="$ROOT" node server.js >> "$ROOT/server.log" 2>&1 &
  SERVER_PID=$!
  health_failures=0
  health_loop &
  WATCH_PID=$!
  wait "$SERVER_PID" 2>/dev/null
  kill "$WATCH_PID" 2>/dev/null
  log "serve: server exited — restarting in 3s"
  sleep 3
done
