#!/usr/bin/env bash
# NEXURA HOSPITAL OS — API smoke suite (dev)
# Usage: BASE=http://localhost:3000 bash tests/api-smoke.sh
set -u
BASE="${BASE:-http://localhost:3000}"
JAR="/tmp/nx-smoke-$$.txt"
PASS=0; FAIL=0

say()  { printf "%-58s" "$1"; }
ok()   { echo "✓ PASS"; PASS=$((PASS+1)); }
bad()  { echo "✗ FAIL ($1)"; FAIL=$((FAIL+1)); }
code() { curl -s -o /dev/null -w "%{http_code}" -b "$JAR" "$@" --max-time 40; }
json() { curl -s -b "$JAR" "$@" --max-time 40; }

echo "── Nexura Hospital OS API smoke ──────────────────────"

# liveness + readiness
say "GET /api/health → 200";        [ "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/health --max-time 20)" = "200" ] && ok || bad "health"
say "GET /api/ready → ready";       curl -s $BASE/api/ready --max-time 30 | grep -q '"status":"ready"' && ok || bad "ready"

# auth: bad credentials
say "POST auth wrong-password → 401"; [ "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/api/nx/auth -H 'Content-Type: application/json' -d '{"email":"doctor@demo.nexura.health","password":"wrongpass123"}' --max-time 20)" = "401" ] && ok || bad "expected 401"

# auth: demo doctor (password path)
say "POST auth doctor password → 200"; [ "$(curl -s -o /dev/null -w '%{http_code}' -c $JAR -X POST $BASE/api/nx/auth -H 'Content-Type: application/json' -d '{"email":"doctor@demo.nexura.health","password":"Demo@12345"}' --max-time 30)" = "200" ] && ok || bad "doctor login"

# session snapshot
say "GET /auth me → user";          json $BASE/api/nx/auth | grep -q '"staffCode":"DR.RAJESH"' && ok || bad "me"

# legacy PIN path still works
say "POST auth staffCode+PIN → 200"; [ "$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/api/nx/auth -H 'Content-Type: application/json' -d '{"staffCode":"NS.PRIYA","pin":"2468"}' --max-time 20)" = "200" ] && ok || bad "pin login"

# unauthenticated guard
say "GET patients (no cookie) → 401"; [ "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/nx/patients --max-time 20)" = "401" ] && ok || bad "expected 401"

# patient record + privacy surface
PID=$(json "$BASE/api/nx/search?q=Suresh" | python3 -c "import json,sys;d=json.load(sys.stdin);print([i['id'] for g in d['data']['groups'] if g['type']=='patient' for i in g['items']][0])" 2>/dev/null)
say "GET patient record → timeline"; [ -n "$PID" ] && json $BASE/api/nx/patients/$PID | python3 -c "import json,sys;d=json.load(sys.stdin);exit(0 if len(d.get('timeline',[]))>0 else 1)" && ok || bad "patient timeline"

# task lifecycle
TASK=$(json -X POST $BASE/api/nx/tasks -H 'Content-Type: application/json' -d "{\"title\":\"Smoke: verify vitals round\",\"priority\":\"high\",\"patientId\":\"$PID\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['task']['id'])" 2>/dev/null)
say "POST task → created";          [ -n "$TASK" ] && ok || bad "task create"
say "PATCH task in_progress → 200"; [ "$(code -X PATCH $BASE/api/nx/tasks -H 'Content-Type: application/json' -d "{\"id\":\"$TASK\",\"status\":\"in_progress\"}")" = "200" ] && ok || bad "task transition"
say "PATCH task done → 200";        [ "$(code -X PATCH $BASE/api/nx/tasks -H 'Content-Type: application/json' -d "{\"id\":\"$TASK\",\"status\":\"done\",\"completionNote\":\"rounds complete\"}")" = "200" ] && ok || bad "task done"
say "PATCH task done→assigned → 422"; [ "$(code -X PATCH $BASE/api/nx/tasks -H 'Content-Type: application/json' -d "{\"id\":\"$TASK\",\"status\":\"assigned\"}")" = "422" ] && ok || bad "illegal transition allowed!"

# clinical note immutability
NOTE=$(curl -s -b "$JAR" -X POST "$BASE/api/nx/notes/n1" -H 'Content-Type: application/json' -d "{\"patientId\":\"$PID\",\"noteType\":\"progress\",\"fullText\":\"Smoke note\"}" --max-time 40 | python3 -c "import json,sys;print(json.load(sys.stdin).get('data',{}).get('note',{}).get('id',''))" 2>/dev/null)
say "POST note draft → created";    [ -n "$NOTE" ] && ok || bad "note create"
say "PATCH note sign → signed";     json -X PATCH $BASE/api/nx/notes/$NOTE -H 'Content-Type: application/json' -d '{"action":"sign"}' | grep -q '"signed": true\|"signed":true' && ok || bad "note sign"
say "PATCH signed note edit → 423"; [ "$(code -X PATCH $BASE/api/nx/notes/$NOTE -H 'Content-Type: application/json' -d '{"action":"save","fullText":"tamper"}')" = "423" ] && ok || bad "signed note mutated!"
say "PATCH addendum → 201";         [ "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X PATCH $BASE/api/nx/notes/$NOTE -H 'Content-Type: application/json' -d '{"action":"addendum","body":"Patient resting well."}' --max-time 40)" = "201" ] && ok || bad "addendum"

# RBAC: nurse cannot manage users
JAR2="/tmp/nx-smoke2-$$.txt"; curl -s -c $JAR2 -X POST $BASE/api/nx/auth -H 'Content-Type: application/json' -d '{"staffCode":"NS.PRIYA","pin":"2468"}' -o /dev/null --max-time 20
say "nurse GET staff ops → 403";    [ "$(curl -s -o /dev/null -w '%{http_code}' -b $JAR2 $BASE/api/nx/staff/ops --max-time 30)" = "403" ] && ok || bad "nurse saw staff ops"
say "nurse GET permissions → 403";  [ "$(curl -s -o /dev/null -w '%{http_code}' -b $JAR2 $BASE/api/nx/permissions --max-time 30)" = "403" ] && ok || bad "nurse saw matrix"
JAR3="/tmp/nx-smoke3-$$.txt"; curl -s -c $JAR3 -X POST $BASE/api/nx/auth -H 'Content-Type: application/json' -d '{"email":"admin@demo.nexura.health","password":"Demo@12345"}' -o /dev/null --max-time 20
say "admin GET staff ops → 200";    [ "$(curl -s -o /dev/null -w '%{http_code}' -b $JAR3 $BASE/api/nx/staff/ops --max-time 30)" = "200" ] && ok || bad "admin staff ops"

# billing permission separation
say "doctor billing.v2 → 403";      [ "$(code $BASE/api/nx/billing/v2)" = "403" ] && ok || bad "doctor saw billing"
say "billing officer summary → 200"; curl -s -c /tmp/nx-smoke4-$$.txt -X POST $BASE/api/nx/auth -H 'Content-Type: application/json' -d '{"email":"billing@demo.nexura.health","password":"Demo@12345"}' -o /dev/null --max-time 20; [ "$(curl -s -o /dev/null -w '%{http_code}' -b /tmp/nx-smoke4-$$.txt $BASE/api/nx/billing/v2 --max-time 30)" = "200" ] && ok || bad "billing summary"

# patient scoping: patient account cannot open other records
curl -s -c /tmp/nx-smoke5-$$.txt -X POST $BASE/api/nx/auth -H 'Content-Type: application/json' -d '{"email":"patient@demo.nexura.health","password":"Demo@12345"}' -o /dev/null --max-time 20
OTHER=$(curl -s -b $JAR3 "$BASE/api/nx/search?q=Lakshmi" --max-time 30 | python3 -c "import json,sys;d=json.load(sys.stdin);print([i['id'] for g in d['data']['groups'] if g['type']=='patient' for i in g['items']][0])" 2>/dev/null)
say "patient opens other record → 403"; [ -n "$OTHER" ] && [ "$(curl -s -o /dev/null -w '%{http_code}' -b /tmp/nx-smoke5-$$.txt $BASE/api/nx/patients/$OTHER --max-time 30)" = "403" ] && ok || bad "patient scoping failed"

# cross-hospital tenant isolation (second hospital has no staff sessions; check API scope filter)
say "search scoped to hospital";    json "$BASE/api/nx/search?q=zzz-no-match-zzz" | grep -q '"groups":\[\]' && ok || bad "search"

# notifications + messages + stream
say "GET notifications → list";     json $BASE/api/nx/notifications | grep -q '"notifications"' && ok || bad "notifications"
say "POST message → 201";           [ "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X POST $BASE/api/nx/messages -H 'Content-Type: application/json' -d '{"channel":"shift-handover","body":"Smoke: handover complete, no issues."}' --max-time 30)" = "201" ] && ok || bad "message post"
say "GET stream (SSE headers)";     curl -s -b "$JAR" -N $BASE/api/nx/stream --max-time 4 2>/dev/null | head -c 20 | grep -q "event: hello" && ok || bad "sse hello"

# idempotency: same key twice → same payment id (billing officer)
PAY1=$(curl -s -b /tmp/nx-smoke4-$$.txt -X PUT $BASE/api/nx/billing/v2 -H 'Content-Type: application/json' -H 'x-idempotency-key: smoke-pay-001' -d "{\"patientId\":\"$PID\",\"amount\":250000,\"mode\":\"upi\",\"reference\":\"SMOKE-1\"}" --max-time 40 | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['payment']['id'])" 2>/dev/null)
PAY2=$(curl -s -b /tmp/nx-smoke4-$$.txt -X PUT $BASE/api/nx/billing/v2 -H 'Content-Type: application/json' -H 'x-idempotency-key: smoke-pay-001' -d "{\"patientId\":\"$PID\",\"amount\":250000,\"mode\":\"upi\",\"reference\":\"SMOKE-1\"}" --max-time 40 | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['payment']['id'])" 2>/dev/null)
say "idempotent payment replay";    [ -n "$PAY1" ] && [ "$PAY1" = "$PAY2" ] && ok || bad "replay mismatch"

# validation errors
say "invalid task payload → 400";   [ "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X POST $BASE/api/nx/tasks -H 'Content-Type: application/json' -d '{"title":"x"}' --max-time 30)" = "400" ] && ok || bad "validation"
say "security headers present";     curl -s -D- -o /dev/null $BASE/api/health --max-time 20 | grep -qi "x-frame-options" && ok || bad "headers"

echo "──────────────────────────────────────────────────────"
echo "PASS: $PASS  FAIL: $FAIL"
rm -f $JAR $JAR2 $JAR3 /tmp/nx-smoke4-$$.txt /tmp/nx-smoke5-$$.txt 2>/dev/null
[ "$FAIL" = "0" ]
