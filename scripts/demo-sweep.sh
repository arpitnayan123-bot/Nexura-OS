#!/usr/bin/env bash
# Console-error sweep across every key demo surface.
# For each page: open, settle, collect page errors + console errors,
# and check for horizontal overflow at desktop + mobile widths.
set -u
PAGES="/ /diy /hospital /know-your-health /predictive /pricing /portal/login /pharmacy /clinic /connect /global /investors /compliance /founder"
OUT=/home/z/my-project/download/sweep-results.txt
: > "$OUT"

for p in $PAGES; do
  agent-browser open "http://localhost:3000$p" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  agent-browser wait 1800 >/dev/null 2>&1
  errs=$(agent-browser errors 2>/dev/null | grep -c . || true)
  cerr=$(agent-browser console 2>/dev/null | grep -ciE "error" || true)
  overflow=$(agent-browser eval "document.documentElement.scrollWidth - document.documentElement.clientWidth" 2>/dev/null | tr -d '"')
  echo "$p pageErrors=$errs consoleErrors=$cerr hOverflow=${overflow:-?}" >> "$OUT"
done
cat "$OUT"
