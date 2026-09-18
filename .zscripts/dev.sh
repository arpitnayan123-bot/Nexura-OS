#!/bin/bash

set -euo pipefail

# ============================================================
# dev.sh — PLATFORM BOOT DEPLOY for Nexura OS (self-healing)
#
# This script is the deploy entry point the sandbox platform
# runs on every boot/resume (start.sh -> .zscripts/dev.sh).
# It must bring the app up from ANY of these states without a
# human:
#   A. Everything running           -> fast no-op path
#   B. Datastore binaries wiped     -> scripts/install-datastores.sh
#      (reset wipes ~/pg-install;    reinstalls + starts both)
#      node_modules/.next survive)
#   C. .env clobbered by the        -> env doctor rewrites the
#      platform's SQLite default       canonical sandbox env
#   D. Fresh/empty Postgres cluster -> prisma migrate deploy;
#      the guardian's heal_db then seeds (marker-table probe
#      + cooldown) exactly as designed
#
# History this fixes:
#   - Boot wrote DATABASE_URL=file:... (SQLite); the schema is
#     Postgres-only -> migrate/serve failed -> publish link dead
#   - Redis binary lost on reset -> every rate-limited route
#     (staff login, portal OTP, MFA, webhooks) 503s fail-closed
#   - db:push --accept-data-loss against a populated Postgres
#     was a data-loss bomb -> replaced with migrate deploy
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

log_step_start() {
        local step_name="$1"
        echo "=========================================="
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting: $step_name"
        echo "=========================================="
        export STEP_START_TIME
        STEP_START_TIME=$(date +%s)
}

log_step_end() {
        local step_name="${1:-Unknown step}"
        local end_time
        end_time=$(date +%s)
        local duration=$((end_time - STEP_START_TIME))
        echo "=========================================="
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Completed: $step_name"
        echo "[LOG] Step: $step_name | Duration: ${duration}s"
        echo "=========================================="
        echo ""
}

# Canonical sandbox environment. The platform's start.sh rewrites
# .env to a one-line SQLite default on EVERY boot; anything that
# still matches that shape (or a missing .env) is replaced wholesale.
# A hand-configured .env (no file: DATABASE_URL) is preserved.
write_canonical_env() {
        cat >"$PROJECT_DIR/.env" <<'EOF'
# Nexura OS — local sandbox configuration (written by boot deploy)
DATABASE_URL=postgresql://nexura@127.0.0.1:5432/nexura
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=nexura-sandbox-jwt-secret-0123456789abcdef
DEMO_MODE=true
EMAIL_TRANSPORT=console
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXURA_MODE=local
EOF
}

start_mini_services() {
        local mini_services_dir="$PROJECT_DIR/mini-services"
        local started_count=0

        log_step_start "Starting mini-services"
        if [ ! -d "$mini_services_dir" ]; then
                echo "Mini-services directory not found, skipping..."
                log_step_end "Starting mini-services"
                return 0
        fi

        for service_dir in "$mini_services_dir"/*; do
                if [ ! -d "$service_dir" ]; then continue; fi
                if [ ! -f "$service_dir/package.json" ]; then continue; fi
                if ! grep -q '"dev"' "$service_dir/package.json"; then continue; fi

                local service_name
                service_name=$(basename "$service_dir")
                echo "Starting $service_name in background..."
                (
                        cd "$service_dir"
                        bun install
                        exec bun run dev
                ) >"$PROJECT_DIR/.zscripts/mini-service-${service_name}.log" 2>&1 &
                disown $! 2>/dev/null || true
                started_count=$((started_count + 1))
        done

        echo "Mini-services startup completed. Started $started_count service(s)."
        log_step_end "Starting mini-services"
}

wait_for_service() {
        local host="$1"
        local port="$2"
        local service_name="$3"
        local max_attempts="${4:-60}"
        local attempt=1

        echo "Waiting for $service_name to be ready on $host:$port..."
        while [ "$attempt" -le "$max_attempts" ]; do
                if curl -s --connect-timeout 2 --max-time 5 "http://$host:$port" >/dev/null 2>&1; then
                        echo "$service_name is ready!"
                        return 0
                fi
                echo "Attempt $attempt/$max_attempts: $service_name not ready yet, waiting..."
                sleep 1
                attempt=$((attempt + 1))
        done

        echo "ERROR: $service_name failed to start within $max_attempts seconds"
        return 1
}

cleanup() {
        if [ -n "${DEV_PID:-}" ] && kill -0 "$DEV_PID" >/dev/null 2>&1; then
                echo "Stopping Next.js server (PID: $DEV_PID)..."
                kill "$DEV_PID" >/dev/null 2>&1 || true
        fi
}

trap cleanup EXIT INT TERM

if ! command -v bun >/dev/null 2>&1; then
        echo "ERROR: bun is not installed or not in PATH"
        exit 1
fi

# ---------- [0/7] env doctor ----------
log_step_start "env doctor"
if [ ! -f "$PROJECT_DIR/.env" ] || grep -Eq '^DATABASE_URL="?file:' "$PROJECT_DIR/.env"; then
        echo "[ENV] platform default / missing .env detected — writing canonical sandbox env"
        write_canonical_env
else
        echo "[ENV] .env preserved (DATABASE_URL is not the platform SQLite default)"
fi
# CRITICAL: the platform exports DATABASE_URL=file:... (SQLite) as a GLOBAL
# process env var — and process env OVERRIDES .env files for Prisma/Next.
# Writing the file is not enough; source it over the process environment so
# every child (bun, prisma, guardian, next-server) inherits corrected values.
set -a
. "$PROJECT_DIR/.env"
set +a
echo "[ENV] sourced .env into process env (DATABASE_URL=${DATABASE_URL%%\?*})"
log_step_end "env doctor"

# ---------- [1/7] dependencies ----------
log_step_start "bun install"
echo "[BUN] Installing dependencies..."
bun install
log_step_end "bun install"

# ---------- [2/7] datastores (install if wiped, start if down) ----------
log_step_start "datastore heal"
export LD_LIBRARY_PATH="$HOME/pg-install/rootfs/usr/lib/x86_64-linux-gnu:$HOME/pg-install/rootfs/usr/lib/llvm-19/lib:${LD_LIBRARY_PATH:-}"
PG_BIN="$(ls -d "$HOME"/pg-install/rootfs/usr/lib/postgresql/*/bin 2>/dev/null | head -1 || true)"
if [ -z "$PG_BIN" ] || [ ! -x "$PG_BIN/initdb" ] || [ ! -x "$HOME/pg-install/rootfs/usr/bin/redis-server" ]; then
        echo "[DS] datastore binaries missing (sandbox reset?) — running full install"
else
        echo "[DS] binaries present — healing daemons if down"
fi
# Idempotent since the idempotent-start guards: installs binaries when
# wiped, initdb's only on a fresh cluster, starts only what's down.
bash "$PROJECT_DIR/scripts/install-datastores.sh"
log_step_end "datastore heal"

# ---------- [3/7] schema (migrate deploy — NEVER db:push) ----------
log_step_start "prisma migrate deploy"
if [ ! -d "$PROJECT_DIR/node_modules/.prisma/client" ]; then
        echo "[PRISMA] generating client..."
        bunx prisma generate
fi
bunx prisma migrate deploy
log_step_end "prisma migrate deploy"

# ---------- [4/7] start app via guardian (production serve) ----------
log_step_start "Starting Next.js server (nx-guardian)"
echo "[APP] Starting production-serve guardian..."
# /dev/null redirect: never let the long-lived guardian hold this script's
# stdout/stderr fd — a platform log collector piping this script would
# otherwise wait on it forever (package.json `dev` still tees dev.log).
bun run dev >/dev/null 2>&1 &
DEV_PID=$!
log_step_end "Starting Next.js server (nx-guardian)"

# ---------- [5/7] wait for serve ----------
log_step_start "Waiting for Next.js server"
wait_for_service "localhost" "3000" "Next.js server"
log_step_end "Waiting for Next.js server"

# ---------- [6/7] health check ----------
log_step_start "Health check"
curl -fsS localhost:3000 >/dev/null
echo "[APP] Health check passed"
log_step_end "Health check"

# ---------- [7/7] mini-services + readiness visibility ----------
start_mini_services

echo "[APP] Server is running in background (PID: $DEV_PID)."
echo "[APP] The guardian's heal_db seeds a hollow database automatically"
echo "[APP] (marker-table probe + 10-min cooldown). Check dev.log for progress."
echo "Use 'kill $DEV_PID' to stop it."
disown "$DEV_PID" 2>/dev/null || true
unset DEV_PID
