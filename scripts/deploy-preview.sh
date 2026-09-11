#!/usr/bin/env bash
# ============================================================
# deploy-preview.sh — canonical way to serve the app so the
# user's preview window ALWAYS shows the latest code.
#
# Why this exists: `next dev` (Turbopack) reuses stable asset
# URLs (e.g. [root-of-the-server]__91b26cea._.css) across
# rebuilds, so browser/CDN caches keep serving stale CSS/JS and
# code changes look "invisible" in the preview. Production
# builds content-hash every asset, so every deploy gets fresh
# URLs and caches are force-busted.
#
# Usage:  bash scripts/deploy-preview.sh
# After any source change, re-run this script, then verify:
#   curl -s localhost:3000/predictive | grep -o '<title>[^<]*</title>'
#   AND confirm the .css href in the HTML differs from deploys past.
# ============================================================
set -euo pipefail
cd /home/z/my-project

echo "[1/4] Stopping any running Next.js servers..."
pkill -f next-server 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
sleep 2

echo "[2/4] Building production bundle (content-hashed assets)..."
node_modules/.bin/next build

echo "[3/4] Starting production server on :3000..."
nohup node_modules/.bin/next start -p 3000 > dev.log 2>&1 &

echo "[4/4] Waiting for health..."
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/predictive 2>/dev/null || echo 000)
  if [ "$code" = "200" ]; then
    echo "UP: /predictive -> 200"
    CSS_HREF=$(curl -s http://localhost:3000/predictive | grep -o '/_next/static/[^"]*\.css[^"]*"' | head -1 | tr -d '"')
    echo "Asset fingerprint for this deploy: $CSS_HREF"
    exit 0
  fi
  sleep 2
done
echo "FAILED to come up — check dev.log" >&2
exit 1
