#!/bin/bash
# E2E verify Aurora Glass v2 — desktop + mobile + white-slab check
set -e

# clean load, force dark-neutral env (page is theme-independent anyway)
agent-browser open "http://localhost:3000/predictive" --wait-for-timeout 6000
agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(x => /allow all|accept/i.test(x.textContent||'')); if (b) b.click(); return 'banner-ok'; })()" 2>/dev/null || true
sleep 1

# --- desktop ---
agent-browser set viewport 1440 900
sleep 2.5
agent-browser screenshot /home/z/my-project/download/pie-v2-top.png
agent-browser eval "window.scrollTo(0, 1200)" 2>/dev/null
sleep 1.2
agent-browser screenshot /home/z/my-project/download/pie-v2-mid.png

# --- white-slab check: scroll to absolute bottom, sample body vs shell coverage ---
agent-browser eval "window.scrollTo(0, document.documentElement.scrollHeight)" 2>/dev/null
sleep 1.2
agent-browser screenshot /home/z/my-project/download/pie-v2-bottom.png
agent-browser eval "(() => { const doc = document.documentElement; const overflowY = doc.scrollHeight - document.querySelector('.nxp-shell').offsetHeight; return JSON.stringify({ scrollH: doc.scrollHeight, shellH: document.querySelector('.nxp-shell').offsetHeight, bodyBg: getComputedStyle(document.body).backgroundColor, overflowPx: overflowY }); })()" 2>/dev/null

# --- mobile 390px ---
agent-browser set viewport 390 844
agent-browser eval "window.scrollTo(0, 0)" 2>/dev/null
sleep 2
agent-browser screenshot /home/z/my-project/download/pie-v2-mobile-top.png
agent-browser eval "window.scrollTo(0, 1800)" 2>/dev/null
sleep 1.2
agent-browser screenshot /home/z/my-project/download/pie-v2-mobile-mid.png

# clean storage to avoid hydration warnings on next session
agent-browser eval "localStorage.clear(); 'cleared'" 2>/dev/null
echo E2E-DONE
