#!/usr/bin/env bash
# ============================================================================
# Nexura self-healing production watchdog (replaces nx-supervisor.sh)
#
# Purpose: make "preview is broken / unstyled / 404 chunks" failures
# impossible to persist. This layer automatically detects and rectifies:
#   1. Server process down            -> syncs assets + starts server
#   2. Stale/missing static assets    -> resync .next/static + public
#   3. Unhealthy responses (HTML/CSS) -> restart server after resync
#
# Loop (every 5s):
#   - no next-server process      -> sync_assets + start
#   - health probe OK             -> reset failure streak
#   - health probe failing x2     -> resync + kill + start (self-heal)
#
# Health probe = homepage HTTP 200 AND first referenced CSS chunk HTTP 200.
# ============================================================================
LOG=/home/z/my-project/server.log
APP=/home/z/my-project
LOCK=$APP/.nx-watchdog.lock

log() { echo "[nx-watchdog] $(date -u +%FT%TZ) $*" >> "$LOG"; }

# Single-instance guard
if [ -f "$LOCK" ] && kill -0 "$(cat "$LOCK" 2>/dev/null)" 2>/dev/null; then
  echo "watchdog already running (pid $(cat "$LOCK"))" >&2
  exit 0
fi
echo $$ > "$LOCK"

sync_assets() {
  cd "$APP" || return 1
  [ -d .next/standalone ] || return 1
  mkdir -p .next/standalone/.next
  rm -rf .next/standalone/.next/static
  cp -r .next/static .next/standalone/.next/static 2>>"$LOG" || true
  rm -rf .next/standalone/public
  cp -r public .next/standalone/public 2>>"$LOG" || true
}

healthy() {
  local html css code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3000/)
  [ "$code" = "200" ] || return 1
  html=$(curl -s --max-time 5 http://127.0.0.1:3000/) || return 1
  css=$(echo "$html" | grep -oE '/_next/static/[^"]+\.css' | head -1)
  [ -n "$css" ] || return 1
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:3000$css")
  [ "$code" = "200" ]
}

start_server() {
  sync_assets || { log "sync_assets failed — standalone missing?"; return 1; }
  cd "$APP/.next/standalone" || return 1
  PORT=3000 HOSTNAME=0.0.0.0 NODE_ENV=production node server.js >>"$LOG" 2>&1 &
  log "server started (pid $!)"
}

log "watchdog booted (pid $$)"
fails=0
while true; do
  cd "$APP" || { sleep 5; continue; }

  if ! pgrep -f "next-server" >/dev/null 2>&1; then
    log "server down — starting"
    start_server
    sleep 6
    continue
  fi

  if healthy; then
    fails=0
  else
    fails=$((fails + 1))
    log "unhealthy (streak=$fails) — healing"
    if [ "$fails" -ge 2 ]; then
      pkill -f "next-server" 2>/dev/null
      sleep 2
      start_server
      log "self-heal restart done"
      fails=0
      sleep 6
    fi
  fi

  sleep 5
done
