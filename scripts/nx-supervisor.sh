#!/usr/bin/env bash
# Nexura Hospital OS — production preview supervisor
# Serves the standalone build on :3000 and restarts it within 3s
# if it ever exits. Safe against pkill patterns: this file's own
# command line is just "bash nx-supervisor.sh".
#
# next build does NOT copy static assets into the standalone output
# (documented Next.js behavior) — sync them on every boot so a stale
# supervisor can never serve a half-built bundle:
#   .next/static        -> .next/standalone/.next/static
#   public/             -> .next/standalone/public
while true; do
  cd /home/z/my-project || { sleep 3; continue; }
  if [ -d .next/standalone ]; then
    mkdir -p .next/standalone/.next
    rm -rf .next/standalone/.next/static
    cp -r .next/static .next/standalone/.next/static 2>>/home/z/my-project/server.log || true
    rm -rf .next/standalone/public
    cp -r public .next/standalone/public 2>>/home/z/my-project/server.log || true
  fi
  cd /home/z/my-project/.next/standalone || { sleep 3; continue; }
  PORT=3000 HOSTNAME=0.0.0.0 NODE_ENV=production node server.js >> /home/z/my-project/server.log 2>&1
  echo "[supervisor] restart $(date -u +%FT%TZ)" >> /home/z/my-project/server.log
  sleep 3
done
