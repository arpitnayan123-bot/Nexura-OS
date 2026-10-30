#!/bin/bash
# Liquid Gold post-transform sweep: visit every page, collect console errors
PAGES=("/" "/pricing" "/compliance" "/investors" "/know-your-health" "/portal/login" "/global" "/founder" "/diy" "/predictive" "/clinic" "/pharmacy" "/connect" "/hospital")
mkdir -p /home/z/my-project/tool-results/gold
agent-browser close >/dev/null 2>&1
sleep 1
for p in "${PAGES[@]}"; do
  agent-browser open "http://localhost:3000$p" >/dev/null 2>&1
  agent-browser wait 4 >/dev/null 2>&1
  errs=$(agent-browser console 2>/dev/null | grep -ci "error" || true)
  name=$(echo "$p" | tr '/' '_' | sed 's/^_//'); [ -z "$name" ] && name="home"
  agent-browser screenshot "/home/z/my-project/tool-results/gold/$name.png" >/dev/null 2>&1
  echo "$p errors=$errs"
done
