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
# Single-instance via noclobber pid-file with TAKEOVER-WAIT: a second
# invocation (e.g. the platform re-running `bun run dev` after a sandbox
# restart) does NOT exit — it waits for the current owner to die and then
# takes over. This guarantees the boot supervisor always has a live child
# and two guardians never fight over :3000.
# Logs to logs/guardian.log.
# ============================================================

set -u
ROOT="/home/z/my-project"
PORT=3000
LOG="$ROOT/logs/guardian.log"
PIDFILE="/tmp/.nx-guardian.pid"

mkdir -p "$ROOT/logs"

log() { echo "[$(date -u +%FT%TZ)] $*" >> "$LOG"; }

# --- single instance: noclobber pid-file + takeover-wait --------
acquire_pidfile() {
  while true; do
    if ( set -o noclobber; echo $$ > "$PIDFILE" ) 2>/dev/null; then
      return 0
    fi
    local old
    old="$(cat "$PIDFILE" 2>/dev/null || true)"
    if [ -n "$old" ] && [ "$old" != "$$" ] && kill -0 "$old" 2>/dev/null; then
      log "guardian: instance $old owns :3000 — waiting to take over"
      while kill -0 "$old" 2>/dev/null; do sleep 5; done
      rm -f "$PIDFILE"
    else
      rm -f "$PIDFILE"
      sleep 1
    fi
  done
}
acquire_pidfile

SEED_FLAG="$ROOT/.guardian-seed-cooldown"

heal_db() {
  # A sandbox reset / platform snapshot restore can leave the SQLite file
  # HOLLOW-BUT-NOT-EMPTY: the hospital core (hospital, staff) survives while
  # every loop-era dataset (drug catalog, pharmacy, clinic, connect, tourism,
  # PIE signals) is gone. Checking ONLY hospital.count()==0 missed that state
  # (this actually happened: preview alive, features hollow). So probe ONE
  # marker table per seed script — if ANY is empty, run the FULL ordered
  # chain. Cooldown flag prevents a failing seed from re-running every loop.
  cd "$ROOT" || return 1
  local probe
  probe="$(node -e "
    const{PrismaClient}=require('@prisma/client');
    const p=new PrismaClient();
    const q=(m)=>p[m].count().then(c=>[m,c]);
    Promise.all(['hospital','nxStaffUser','indianDrug','pharmaBranch','scheduleHEntry','clinicPatient','connectConnection','phlebotomist','tourismProcedure','pieBioSignal'].map(q))
      .then(rs=>{console.log(rs.filter(r=>r[1]===0).map(r=>r[0]).join(',')||'OK');return p.\$disconnect()})
      .catch(()=>console.log('err'));
  " 2>/dev/null)"
  if [ "$probe" = "OK" ] || [ "$probe" = "err" ]; then
    return 0
  fi
  # cooldown: at most one heal attempt per 10 minutes
  if [ -f "$SEED_FLAG" ] && [ -n "$(find "$SEED_FLAG" -mmin -10 2>/dev/null)" ]; then
    log "db: hollow tables ($probe) — seed cooldown active, skipping"
    return 0
  fi
  touch "$SEED_FLAG"
  log "db: hollow database detected (missing: $probe) — running full seed chain"
  npm run seed:all >> "$LOG" 2>&1 \
    && bun scripts/seed-nx-v5.ts >> "$LOG" 2>&1 \
    && bun scripts/seed-hospital-bootstrap.ts >> "$LOG" 2>&1 \
    && bun scripts/legacy/seed-pharmacy.ts >> "$LOG" 2>&1 \
    && bun scripts/seed-pharmacy-compliance.ts >> "$LOG" 2>&1 \
    && bun scripts/seed-clinic-drugs.ts >> "$LOG" 2>&1 \
    && bun scripts/legacy/seed-clinic.ts >> "$LOG" 2>&1 \
    && bun scripts/seed-connect.ts >> "$LOG" 2>&1 \
    && bun scripts/seed-portal.ts >> "$LOG" 2>&1 \
    && bun scripts/seed-tourism.ts >> "$LOG" 2>&1 \
    && bun scripts/seed-chronic.ts >> "$LOG" 2>&1 \
    && bun scripts/seed-pie.ts >> "$LOG" 2>&1 \
    && log "db: full seed chain complete (was hollow: $probe)"
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
  # ATOMIC SWAP: copy to a .tmp dir on the SAME filesystem, then mv.
  # A same-fs mv is instantaneous, so a browser racing a boot can never
  # request a chunk from a HALF-COPIED static tree (the old rm -rf + cp
  # left a multi-second 404 window on every boot — the recurring
  # "preview refreshing / contents not loading" symptom).
  # If the copy fails we keep the previous tree intact.
  rm -rf .next/standalone/.next/static.tmp .next/standalone/.next/static.old
  if cp -r .next/static .next/standalone/.next/static.tmp 2>>"$LOG"; then
    mv .next/standalone/.next/static .next/standalone/.next/static.old 2>/dev/null || true
    mv .next/standalone/.next/static.tmp .next/standalone/.next/static
    rm -rf .next/standalone/.next/static.old
  else
    rm -rf .next/standalone/.next/static.tmp
    log "static sync: copy failed — keeping previous tree"
  fi
  rm -rf .next/standalone/public.tmp .next/standalone/public.old
  if cp -r public .next/standalone/public.tmp 2>>"$LOG"; then
    mv .next/standalone/public .next/standalone/public.old 2>/dev/null || true
    mv .next/standalone/public.tmp .next/standalone/public
    rm -rf .next/standalone/public.old
  else
    rm -rf .next/standalone/public.tmp
    log "static sync: public copy failed — keeping previous tree"
  fi
}

kill_stale_listeners() {
  # next-server renames its process title — match BOTH patterns.
  pkill -f "next-server" 2>/dev/null && log "watchdog: killed stale next-server listener"
  pkill -f "standalone/server\.js" 2>/dev/null && log "watchdog: killed stale standalone server"
  # DEV IMPOSTORS: a raw `next dev` on :3000 serves dev-mode Turbopack
  # assets under STABLE URLs, so browser/proxy caches keep stale CSS/JS
  # and the preview looks frozen. This was the recurring "changes not
  # visible" bug — the guardian never tolerates a dev server on :3000.
  pkill -f "next dev" 2>/dev/null && log "watchdog: killed DEV IMPOSTOR (next dev)"
  pkill -f "\.next/dev" 2>/dev/null && log "watchdog: killed dev worker (.next/dev)"
  # never let an old supervisor fight the guardian
  pkill -f "nx-supervisor\.sh" 2>/dev/null && log "watchdog: killed legacy supervisor"
  sleep 1
}

do_build() {
  cd "$ROOT" || return 1
  # A build that dies mid-run (sandbox hiccup, OOM, restart) leaves
  # .next/lock behind; every rebuild then fails with "Unable to acquire
  # lock" and a ~100s outage stretches into many minutes (seen live
  # 2026-09-11). If no real `next build` process exists, the lock is
  # STALE -> clear it and proceed. If one IS running (deploy in flight),
  # don't fight it — wait for the next cycle.
  if pgrep -f "next build" >/dev/null 2>&1; then
    log "build: skipped — a next build is already running; will retry next cycle"
    return 1
  fi
  if [ -e .next/lock ]; then
    rm -f .next/lock
    log "build: cleared STALE lock (no build process alive)"
  fi
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
# assets (this Next version snapshots .next/static at boot). A page
# that returns 200 but whose CSS chunk 404s IS an outage (unstyled
# preview), so the probe checks the API AND every referenced CSS chunk
# of /predictive (the flagship surface). It ALSO scans for dev-mode
# fingerprints: if `root-of-the-server`, `hmr-client` or `next-devtools`
# appear in the HTML, a `next dev` impostor owns :3000 and the preview
# is stale — treated as a hard outage so the healer evicts it.
probe_healthy() {
  curl -fs -o /dev/null "http://127.0.0.1:$PORT/api/nx/system-status" --max-time 8 || return 1
  local html css code
  html="$(curl -fs --max-time 8 "http://127.0.0.1:$PORT/predictive" 2>/dev/null)" || return 1
  if printf '%s' "$html" | grep -qE 'root-of-the-server|hmr-client|next-devtools'; then
    log "health: DEV-MODE fingerprint on :3000 — impostor detected"
    return 1
  fi
  css="$(printf '%s' "$html" | grep -oE '/_next/static/[^"]+\.css' | head -1)"
  [ -n "$css" ] || return 1
  while read -r chunk; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "http://127.0.0.1:$PORT$chunk")"
    if [ "$code" != "200" ]; then
      log "health: CSS chunk $chunk -> $code"
      return 1
    fi
  done <<EOF
$(printf '%s' "$html" | grep -oE '/_next/static/[^"]+\.css' | sort -u)
EOF
  return 0
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
        log "health: 3 consecutive failures — restarting server (statics resync + impostor eviction on boot)"
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

  # ROLLBACK INSURANCE: checkpoint uncommitted work + refresh git
  # bundle backups (throttled inside the script; backgrounded so it
  # can never delay serving). Commit-only — it cannot destroy work.
  "$ROOT/scripts/nx-autocommit.sh" &

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
