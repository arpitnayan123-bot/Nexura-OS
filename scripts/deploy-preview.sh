#!/usr/bin/env bash
# ============================================================
# deploy-preview.sh — canonical deploy with SERVE-SIDE VERIFICATION
#
# ROOT CAUSE this pipeline defends against (found 2026-09-11):
#   The sandbox boot chain is  tini -> /start.sh -> bun run dev.
#   After every sandbox restart/resume, `bun run dev` relaunched a
#   raw `next dev` server on :3000. Dev mode serves Turbopack assets
#   under STABLE urls (e.g. [root-of-the-server]__91b26cea._.css), so
#   browser/proxy caches kept stale CSS/JS and the preview window
#   looked frozen on an old version — for EVERY feature, not just
#   /predictive. The production build deployed moments earlier was
#   silently replaced within seconds.
#
# PERMANENT FIX (defense in depth):
#   L1  package.json `dev` now boots the guardian (production serve),
#       so the platform's own restart mechanism can never start a dev
#       impostor. True dev mode remains available as `npm run dev:real`.
#   L2  nx-guardian.sh kills next-dev impostors every cycle and its
#       health probe FAILS on dev-mode fingerprints in served HTML.
#   L3  This deploy script stops guardian+impostors, forces a fresh
#       content-hashed production build, hands :3000 to the guardian,
#       then VERIFIES THE SERVED OUTPUT (never trust disk state):
#         - zero dev-mode fingerprints on key routes
#         - every referenced CSS chunk actually downloads (200)
#         - latest-code content markers present on key routes
#         - Cache-Control headers correct (HTML no-store, static immutable)
#   L4  next.config.ts sends Cache-Control: no-store on documents so
#       no browser/CDN layer can ever cache a stale HTML shell.
#
# Exit 0 ONLY if every served check passes. Usage:
#   bash scripts/deploy-preview.sh
# ============================================================
set -euo pipefail
cd /home/z/my-project

echo "[1/6] Stopping guardian + every server on :3000 ..."
if [ -f /tmp/.nx-guardian.pid ]; then
  kill -9 "$(cat /tmp/.nx-guardian.pid 2>/dev/null)" 2>/dev/null || true
  rm -f /tmp/.nx-guardian.pid
fi
pkill -9 -f "bash scripts/nx-guardian.sh" 2>/dev/null || true
pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "standalone/server\.js" 2>/dev/null || true
sleep 2

echo "[2/6] Healing .env for the build (matches guardian heal_env) ..."
mkdir -p logs
[ -f .env ] || : > .env
if ! grep -q "^DATABASE_URL=" .env; then
  echo "DATABASE_URL=file:/home/z/my-project/db/custom.db" >> .env
  echo "  restored DATABASE_URL"
fi
# next build runs module-eval of API routes in production mode, which
# refuses to proceed without a real JWT_SECRET — heal it BEFORE building.
jwt="$( { grep -E '^JWT_SECRET=' .env | head -1 | cut -d= -f2-; } 2>/dev/null || true )"
if [ -z "$jwt" ] || [ "${#jwt}" -lt 16 ]; then
  grep -v '^JWT_SECRET=' .env > .env.tmp 2>/dev/null || true
  mv .env.tmp .env
  node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))" >> .env
  echo "  regenerated JWT_SECRET"
fi
if ! grep -q "^DEMO_MODE=" .env; then
  echo "DEMO_MODE=true" >> .env
  echo "  set DEMO_MODE=true"
fi

echo "[3/6] Building production bundle (content-hashed assets) ..."
if ! npx next build > logs/deploy-build.log 2>&1; then
  echo "BUILD FAILED — last 30 lines of logs/deploy-build.log:"
  tail -30 logs/deploy-build.log
  exit 1
fi
grep -m1 -E "Compiled successfully|✓" logs/deploy-build.log || true

echo "[4/6] Syncing statics + handing :3000 to the guardian ..."
rm -rf .next/standalone/.next/static .next/standalone/public
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
BUILD_ID_DISPLAY="$(cat .next/standalone/.next/BUILD_ID 2>/dev/null || echo unknown)"
echo "  BUILD_ID: $BUILD_ID_DISPLAY"
nohup bash scripts/nx-guardian.sh >> logs/guardian-boot.log 2>&1 &
disown || true

echo "[5/6] Waiting for health ..."
up=0
for i in $(seq 1 45); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/predictive 2>/dev/null || echo 000)
  if [ "$code" = "200" ]; then up=1; break; fi
  sleep 2
done
if [ "$up" != "1" ]; then
  echo "FAILED to come up — check logs/guardian.log and server.log"
  exit 1
fi
sleep 2

echo "[6/6] Serve-side verification (never trust disk state) ..."
FAIL=0

# 6a. dev-mode fingerprints must be ZERO on key routes
for route in / /predictive /pricing /know-your-health; do
  html=$(curl -s --max-time 10 "http://localhost:3000$route" || true)
  if printf '%s' "$html" | grep -qE 'root-of-the-server|hmr-client|next-devtools'; then
    echo "  FAIL: dev-mode fingerprint served on $route"; FAIL=1
  else
    echo "  ok: $route — zero dev-mode fingerprints"
  fi
done

# 6b. every CSS chunk referenced by /predictive + / must download (200)
chunks=$( { curl -s --max-time 10 http://localhost:3000/predictive | grep -oE '/_next/static/[^"]+\.css' || true; }
         { curl -s --max-time 10 http://localhost:3000/ | grep -oE '/_next/static/[^"]+\.css' || true; } )
chunks=$(printf '%s\n' "$chunks" | sort -u)
if [ -z "$chunks" ]; then
  echo "  FAIL: no CSS chunks referenced in served HTML"; FAIL=1
fi
for css in $chunks; do
  c=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://localhost:3000$css" || echo 000)
  if [ "$c" = "200" ]; then
    echo "  ok: ${css##*/} -> 200"
  else
    echo "  FAIL: $css -> $c"; FAIL=1
  fi
done
echo "  CSS fingerprints this deploy:"
printf '%s\n' "$chunks" | sed 's/^/    /'

# 6c. latest-code content markers on key routes (loop features)
check_marker() { # route, grep pattern, label
  local html
  html=$(curl -s --max-time 10 "http://localhost:3000$1" || true)
  if printf '%s' "$html" | grep -q "$2"; then
    echo "  ok: $1 contains [$3]"
  else
    echo "  FAIL: $1 missing [$3]"; FAIL=1
  fi
}
check_marker /pricing       "Start onboarding" "loop-23 honest CTAs"
# /predictive is client-only (ssr:false boot shell since the perf pass) —
# visible landing text can never appear in SSR HTML. Verify its SSR meta
# instead; interactive content is browser-verified after deploy.
check_marker /predictive    "calibrated for Indian bodies" "predictive SSR shell"
check_marker /              "108"              "loop-11 emergency line"

# 6d. cache-control headers (HTML no-store, hashed static immutable)
doc_cc=$(curl -sI --max-time 10 http://localhost:3000/predictive | tr -d '\r' | { grep -i '^cache-control:' || true; } | head -1)
if printf '%s' "$doc_cc" | grep -qi "no-store"; then
  echo "  ok: HTML Cache-Control -> $doc_cc"
else
  echo "  FAIL: HTML Cache-Control not no-store ($doc_cc)"; FAIL=1
fi
first_css=$(printf '%s\n' "$chunks" | head -1)
if [ -n "$first_css" ]; then
  css_cc=$(curl -sI --max-time 10 "http://localhost:3000$first_css" | tr -d '\r' | { grep -i '^cache-control:' || true; } | head -1)
  if printf '%s' "$css_cc" | grep -qi "immutable"; then
    echo "  ok: static Cache-Control -> $css_cc"
  else
    echo "  FAIL: static Cache-Control not immutable ($css_cc)"; FAIL=1
  fi
fi

if [ "$FAIL" != "0" ]; then
  echo "DEPLOY FAILED VERIFICATION — the preview is NOT serving the latest build."
  exit 1
fi
echo "DEPLOY VERIFIED — :3000 serves the latest production build via the guardian."
