#!/usr/bin/env bash
# Live verification sweep: all Know-Your-Health AI routes + assistant + hospital AI.
# Usage: bash scripts/test-kyh-live.sh
BASE="http://localhost:3000"
PASS=0; FAIL=0; RESULTS=""

check() { # name, json
  local name="$1" body="$2"
  sleep "${PACING:-16}"  # stay under the 20-req/5min AI gate
  local out
  out=$(curl -s --max-time 75 -X POST "$BASE/api/know-your-health/$name" -H "Content-Type: application/json" -d "$body")
  if echo "$out" | grep -qi '"error"'; then
    FAIL=$((FAIL+1)); RESULTS+="FAIL $name -> $(echo "$out" | head -c 160)\n"
  else
    PASS=$((PASS+1)); RESULTS+="PASS $name -> $(echo "$out" | head -c 110)\n"
  fi
}

# --- text routes ---
check "symptoms-checker" '{"symptoms":"persistent dry cough for 10 days, worse at night"}'
check "diet-planner" '{"age":34,"heightCm":170,"weightKg":78,"calorieTarget":1800,"goal":"weight loss","dietaryPreference":"vegetarian"}'
check "disease-risk" '{"age":45,"heightCm":168,"weightKg":80,"familyHistoryDiabetes":true,"smoker":false,"physicalActivity":"low"}'
check "mental-wellness" '{"phq9":[1,1,2,0,1,1,0,1,1],"gad7":[1,2,1,0,1,0,1]}'
check "sleep-quality" '{"bedtime":"01:00","wakeTime":"07:00","sleepLatencyMin":25,"awakenings":3,"totalAwakeMin":45,"quality":"fair","mood":"tired","flags":["late_screen_use"]}'
check "med-interaction" '{"medications":["metformin 500mg","amlodipine 5mg","aspirin 75mg"]}'
check "bp-analyzer" '{"readings":[{"systolic":148,"diastolic":95,"time":"morning"},{"systolic":142,"diastolic":92,"time":"evening"}],"age":50}'
check "diabetes-care" '{"fastingSugar":142,"postMealSugar":230,"hba1c":7.8,"medications":"metformin"}'
check "womens-care" '{"age":29,"concern":"irregular periods last 3 months","cycleInfo":"30 day cycle","symptoms":"cramps","pregnancyStatus":"no"}'
check "ayurveda" '{"answers":["a","b","c","a","b","c","a","b","c","a","b","c","a","b","c","a","b","c","a","b"]}'
check "health-quiz" '{"questions":[{"id":"q1","question":"t","options":["a","b","c","d"],"correctIndex":1,"explanation":"e","topic":"Diabetes"}],"answers":{"q1":1}}'

# --- vision routes (generated test JPEG, nested image object) ---
IMG_B64=$(python3 - <<'PY'
import base64, io
try:
    from PIL import Image
    img = Image.new("RGB", (64, 64), (200, 120, 90))
    for x in range(64):
        for y in range(20, 44):
            img.putpixel((x, y), (250, 240, 230))
    buf = io.BytesIO(); img.save(buf, "JPEG"); print(base64.b64encode(buf.getvalue()).decode())
except Exception:
    print("")
PY
)
if [ -n "$IMG_B64" ]; then
  check "food-scan" "{\"image\":{\"base64\":\"$IMG_B64\",\"mimeType\":\"image/jpeg\"},\"mealType\":\"lunch\"}"
  check "derma-scan" "{\"image\":{\"base64\":\"$IMG_B64\",\"mimeType\":\"image/jpeg\"},\"concern\":\"small rash on arm\"}"
  check "xray-reader" "{\"image\":{\"base64\":\"$IMG_B64\",\"mimeType\":\"image/jpeg\"},\"bodyPart\":\"chest\"}"
else
  echo "SKIP vision routes (no PIL)"
fi

# lab-analyzer: text mode with tests array
check "lab-analyzer" '{"tests":[{"name":"Hemoglobin","value":"11.2","unit":"g/dL"},{"name":"Fasting glucose","value":"118","unit":"mg/dL"}]}'

# --- assistant + hospital AI ---
sleep "${PACING:-16}"
A_OUT=$(curl -s --max-time 75 -X POST "$BASE/api/assistant" -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Book a dental appointment tomorrow"}]}')
if echo "$A_OUT" | grep -qi '"error"'; then FAIL=$((FAIL+1)); RESULTS+="FAIL assistant -> $(echo "$A_OUT" | head -c 160)\n"; else PASS=$((PASS+1)); RESULTS+="PASS assistant -> $(echo "$A_OUT" | head -c 110)\n"; fi

echo -e "$RESULTS"
echo "=============================="
echo "PASS=$PASS FAIL=$FAIL"
