#!/bin/bash
# Screenshot /predictive current state — desktop full page
agent-browser open "http://localhost:3000/predictive" --wait-for-timeout 6000
# handle cookie banner if present
agent-browser snapshot 2>/dev/null | head -30
agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(x => /allow all|accept/i.test(x.textContent||'')); if (b) b.click(); return 'banner-ok'; })()" 2>/dev/null
sleep 1
agent-browser set-viewport 1440 900
sleep 2
agent-browser screenshot /home/z/my-project/download/pie-current-top.png
agent-browser eval "window.scrollTo(0, document.body.scrollHeight * 0.55)" 2>/dev/null
sleep 1
agent-browser screenshot /home/z/my-project/download/pie-current-mid.png
agent-browser eval "window.scrollTo(0, document.body.scrollHeight)" 2>/dev/null
sleep 1
agent-browser screenshot /home/z/my-project/download/pie-current-bottom.png
echo DONE
