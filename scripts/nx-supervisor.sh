#!/usr/bin/env bash
# Nexura Hospital OS — production preview supervisor
# Serves the standalone build on :3000 and restarts it within 3s
# if it ever exits. Safe against pkill patterns: this file's own
# command line is just "bash nx-supervisor.sh".
while true; do
  cd /home/z/my-project/.next/standalone || { sleep 3; continue; }
  PORT=3000 HOSTNAME=0.0.0.0 NODE_ENV=production node server.js >> /home/z/my-project/server.log 2>&1
  echo "[supervisor] restart $(date -u +%FT%TZ)" >> /home/z/my-project/server.log
  sleep 3
done
