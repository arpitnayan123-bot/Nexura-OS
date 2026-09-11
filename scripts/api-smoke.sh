#!/usr/bin/env bash
# Nexura publish-readiness API smoke
# Probes every /api/nx route family root with GET. Expectations:
#   200/207 = healthy   401/403 = alive + auth-gated (correct behavior)
#   Anything else (404/500/503) = FAIL
BASE=${1:-http://localhost:3000}
PASS=0; FAIL=0; FAILED=()
probe() { # probe <path> — 200/207/400/401/403/405 = alive & behaving
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$BASE$1")
  case "$code" in
    200|207|400|401|403|405) PASS=$((PASS+1));;
    *) FAIL=$((FAIL+1)); FAILED+=("$1->$code");;
  esac
}
# family roots that have real root handlers
for fam in abac analytics audit auth automations beds billing compliance dicom ed encounters escalations events hl7 labs messages notifications onboard openapi or orders overview pathways patients permissions pharmacy plugins prefs schedule search simulations supply system-status tasks tenants workspace; do
  probe "/api/nx/$fam"
done
# families whose handlers live at subroutes
probe "/api/nx/docs/versions"
probe "/api/nx/fhir/Patient"
probe "/api/nx/gateway/keys"
probe "/api/nx/gateway/v1/patients"
probe "/api/nx/genomics/profile"
probe "/api/nx/identity/vc"
probe "/api/nx/insurance/settlement"
probe "/api/nx/journey/predicted"
probe "/api/nx/notes/note_demo"
probe "/api/nx/offline/sync"
probe "/api/nx/prescriptions/sign"
probe "/api/nx/system/errors"
probe "/api/nx/security/posture"
probe "/api/nx/staff/ops"
probe "/api/nx/telehealth/route"
probe "/api/nx/twin/simulate"
probe "/api/nx/wearables/insights"
probe "/api/nx/webhooks/endpoints"
probe "/api/nx/ai"
probe "/api/nx/ai/thresholds"
# Nexura Predictive Health Intelligence (PHI) — status is public (200);
# everything else is session-gated (401) or method-gated (405) or bad-input (400)
echo "PASS=$PASS FAIL=$FAIL"
for f in "${FAILED[@]}"; do echo "  FAIL: $f"; done
[ "$FAIL" -eq 0 ]
