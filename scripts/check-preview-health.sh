#!/usr/bin/env bash
# ============================================================
# check-preview-health.sh — served-output health gate
#
# Never trust disk state: everything here checks what :3000
# ACTUALLY SERVES.
#   1. Key routes return 200
#   2. Every _next/static asset referenced by the served HTML
#      (css/js/img/font, extension-anchored to survive truncated
#      RSC flight streams) downloads with 200
#   3. An RSC flight request for /diy returns 200
# Prints "HEALTH: OK" only if every check passes (exit 0).
# ============================================================
set -uo pipefail
BASE="${1:-http://localhost:3000}"
FAIL=0

say_fail() { echo "  FAIL: $1"; FAIL=1; }

# -- 1. key routes -----------------------------------------------------
for p in / /diy /portal/login; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$BASE$p")
  [ "$code" = "200" ] || say_fail "$p -> $code"
done

# -- 2. every referenced static asset ----------------------------------
HTML=$(curl -s --max-time 15 "$BASE/")
ASSETS=$(printf '%s' "$HTML" | grep -oE '/_next/static/[a-zA-Z0-9/_.-]+\.(js|css|woff2?|png|jpg|svg|map|txt)' | sort -u)
if [ -z "$ASSETS" ]; then
  say_fail "no static assets found in served HTML"
else
  n_total=0; n_bad=0
  while IFS= read -r a; do
    n_total=$((n_total+1))
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$BASE$a")
    if [ "$code" != "200" ]; then n_bad=$((n_bad+1)); say_fail "$a -> $code"; fi
  done <<< "$ASSETS"
  echo "  assets: $((n_total-n_bad))/$n_total -> 200"
fi

# -- 3. RSC flight request --------------------------------------------
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 -H "RSC: 1" "$BASE/diy")
[ "$code" = "200" ] || say_fail "RSC /diy -> $code"

# -- verdict ------------------------------------------------------------
if [ "$FAIL" = "0" ]; then echo "HEALTH: OK"; exit 0
else echo "HEALTH: FAIL"; exit 1; fi
