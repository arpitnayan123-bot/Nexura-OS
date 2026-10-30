#!/usr/bin/env bash
# ============================================================
# nx-serve.sh — IDEMPOTENT standalone server launcher
# Safe for humans, agents and cron: never double-starts, never
# kills anything, never rebuilds. If :3000 is healthy it is a
# no-op. Otherwise it boots the existing standalone build with
# the project .env applied (postgres + redis must be up; run
# scripts/ensure-datastores.sh first if unsure).
#
# Launch mechanics matter on this sandbox: processes must detach
# the way PostgreSQL's pg_ctl does — the parent launcher EXITS
# immediately and the daemon re-parents to init. Plain `nohup &
# setsid` children get reaped by the session reaper here, which
# is why this script daemonizes via a detached node spawn.
# ============================================================
set -u
ROOT="/home/z/my-project"
cd "$ROOT" || exit 1

health() { curl -s -o /dev/null -w "%{http_code}" -m 4 "http://127.0.0.1:3000/api/health" 2>/dev/null; }

if [ "$(health)" = "200" ]; then
  echo "[nx-serve] :3000 already healthy — nothing to do"
  exit 0
fi

# datastores first (no-op when up)
bash "$ROOT/scripts/ensure-datastores.sh" >/dev/null 2>&1 || true

if [ ! -f "$ROOT/.next/standalone/server.js" ]; then
  echo "[nx-serve] no standalone build present — run: NODE_OPTIONS=--max-old-space-size=3584 npx next build" >&2
  exit 1
fi

set -a; . "$ROOT/.env" 2>/dev/null; set +a
mkdir -p "$ROOT/logs"
export NX_STANDALONE_CWD="$ROOT/.next/standalone"
export NX_STANDALONE_LOG="$ROOT/logs/standalone.log"

node -e '
const cp = require("child_process");
const fs = require("fs");
const out = fs.openSync(process.env.NX_STANDALONE_LOG, "a");
const child = cp.spawn(process.execPath, ["server.js"], {
  cwd: process.env.NX_STANDALONE_CWD,
  detached: true,
  stdio: ["ignore", out, out],
  env: process.env,
});
child.unref();
fs.writeFileSync(process.env.NX_STANDALONE_LOG.replace(/log$/, "pid"), String(child.pid));
console.log("[nx-serve] daemonized standalone server, pid", child.pid);
'
sleep 5
[ "$(health)" = "200" ] && echo "[nx-serve] :3000 healthy" || echo "[nx-serve] started — health still warming (see logs/standalone.log)"
