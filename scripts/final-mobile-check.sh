#!/bin/bash
# FINAL mobile 390px overflow check — every public route
PAGES=("/" "/pricing" "/compliance" "/investors" "/know-your-health" "/portal/login" "/global" "/founder" "/diy" "/predictive" "/clinic" "/pharmacy" "/connect" "/hospital")
agent-browser close >/dev/null 2>&1
sleep 1
FAIL=0
for p in "${PAGES[@]}"; do
  agent-browser open "http://localhost:3000$p" >/dev/null 2>&1
  agent-browser wait 4 >/dev/null 2>&1
  over=$(agent-browser eval "document.documentElement.scrollWidth - document.documentElement.clientWidth" 2>/dev/null | tr -dc '0-9-')
  errs=$(agent-browser console 2>/dev/null | grep -ci "error" || true)
  name=$(echo "$p" | tr '/' '_' | sed 's/^_//'); [ -z "$name" ] && name="home"
  agent-browser setviewport 390 844 >/dev/null 2>&1
  agent-browser wait 2 >/dev/null 2>&1
  over_m=$(agent-browser eval "document.documentElement.scrollWidth - document.documentElement.clientWidth" 2>/dev/null | tr -dc '0-9-')
  agent-browser screenshot "/home/z/my-project/tool-results/gold/m-$name.png" >/dev/null 2>&1
  echo "$p desktop_overflow=$over mobile390_overflow=$over_m errors=$errs"
  [ "$over_m" != "0" ] && FAIL=1
done
echo "MOBILE_FAIL=$FAIL"
