#!/usr/bin/env bash
# Live smoke of tonight's improvement pass — every changed surface must answer.
set -u
ROOT="/home/z/my-project"
cd "$ROOT"

pass=0; fail=0
check() { # check <label> <haystack> <regex>
  local label="$1" haystack="$2" pattern="$3"
  if echo "$haystack" | rg -q "$pattern"; then
    echo "PASS  $label"; pass=$((pass+1))
  else
    echo "FAIL  $label"; fail=$((fail+1))
  fi
}

echo "=== Pages ==="
for p in / /pricing /know-your-health /clinic /clinic/book/rao-clinic /pharmacy /portal /portal/login /connect /connect/patient /global /global/dashboard /diy /vitals /predictive /emergency /care /labs /privacy /terms; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$p")
  check "GET $p" "$code" "^200$"
done

echo "=== APIs — new tonight ==="
d=$(curl -s "http://localhost:3000/api/global?scope=desk")
check "desk scope: full payload" "$d" '"kanban"'
check "desk scope: stats" "$d" '"conversionRate"'
check "desk scope: coordinators" "$d" '"coordinators"'

check "patient-identity (demo)" "$(curl -s http://localhost:3000/api/connect/patient-identity)" '"source":"demo"'

a=$(curl -s "http://localhost:3000/api/clinic/appointments?range=today")
check "appointments GET today" "$a" '"appointments"'
check "appointments GET upcoming" "$(curl -s 'http://localhost:3000/api/clinic/appointments?range=upcoming')" '"appointments"'
check "appointments GET past" "$(curl -s 'http://localhost:3000/api/clinic/appointments?range=past')" '"appointments"'

v=$(curl -s "http://localhost:3000/api/clinic/visit?recent=1")
check "visit recent feed" "$v" '"visits"'

b=$(curl -s "http://localhost:3000/api/clinic/booking?slug=rao-clinic")
check "booking page data (slug)" "$b" 'Dr. Rao Family Clinic'

echo "=== APIs — regressions ==="
check "ready" "$(curl -s http://localhost:3000/api/ready)" '"status":"ready"'
check "clinic dashboard" "$(curl -s http://localhost:3000/api/clinic/dashboard)" '"kpis"'
check "pharmacy inventory" "$(curl -s http://localhost:3000/api/pharmacy/inventory)" "."
check "public hospitals" "$(curl -s 'http://localhost:3000/api/global?action=hospitals')" '"hospitals"'
check "public cost_comparison" "$(curl -s 'http://localhost:3000/api/global?action=cost_comparison')" '"comparison"'
check "public testimonials" "$(curl -s 'http://localhost:3000/api/global?action=testimonials')" '"testimonials"'
check "unknown action still 400" "$(curl -s 'http://localhost:3000/api/global')" 'unknown_action'

echo "=== Booking loop end-to-end ==="
cid=$(curl -s "http://localhost:3000/api/clinic/booking?slug=rao-clinic" | python3 -c "import json,sys; print(json.load(sys.stdin)['clinic']['id'])")
did=$(curl -s "http://localhost:3000/api/clinic/booking?slug=rao-clinic" | python3 -c "import json,sys; print(json.load(sys.stdin)['doctors'][0]['id'])")
bk=$(curl -s -X POST http://localhost:3000/api/clinic/booking -H "Content-Type: application/json" -d "{\"clinicId\":\"$cid\",\"doctorId\":\"$did\",\"patientName\":\"Smoke Loop\",\"phone\":\"+91 90000 00001\",\"slot\":\"2026-09-16T11:00:00.000Z\"}")
check "create booking" "$bk" '"ok":true'
bid=$(echo "$bk" | python3 -c "import json,sys; print(json.load(sys.stdin)['booking']['id'])")
acc=$(curl -s -X POST http://localhost:3000/api/clinic/booking -H "Content-Type: application/json" -d "{\"action\":\"accept\",\"bookingId\":\"$bid\"}")
check "accept booking -> appointment" "$acc" '"appointment"'
check "accept marks converted" "$acc" '"status":"converted"'
dup=$(curl -s -X POST http://localhost:3000/api/clinic/booking -H "Content-Type: application/json" -d "{\"action\":\"accept\",\"bookingId\":\"$bid\"}")
check "double-accept rejected 409" "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/clinic/booking -H 'Content-Type: application/json' -d "{\"action\":\"accept\",\"bookingId\":\"$bid\"}")" '^409$'

echo "=== Estimate contract ==="
pid=$(curl -s "http://localhost:3000/api/global?scope=desk" | python3 -c "import json,sys; print(json.load(sys.stdin)['procedures'][0]['id'])")
est=$(curl -s -X POST http://localhost:3000/api/global -H "Content-Type: application/json" -d "{\"action\":\"generate_estimate\",\"procedureId\":\"$pid\",\"stayDays\":7,\"extras\":[]}")
check "estimate flat fields" "$est" '"procedureFee"'
check "estimate totals" "$est" '"totalINR"'

echo
echo "RESULT: $pass passed, $fail failed"
exit $fail
