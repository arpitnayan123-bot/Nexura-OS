#!/usr/bin/env node
/** Add capability labels to every AI call site (ai-cost-metering-1).
 *  Each old string must match EXACTLY ONCE or the script aborts — no silent
 *  partial rewrites. Run from repo root: node scripts/label-ai-capabilities.js */
const fs = require("fs");

const edits = [
  // ---- know-your-health (uniform patterns) ----
  [
    "src/app/api/know-your-health/ayurveda/route.ts",
    [
      "runText<any>(prompt, INDIA_PREAMBLE)",
      'runText<any>(prompt, INDIA_PREAMBLE, "kyh.ayurveda")',
    ],
  ],
  [
    "src/app/api/know-your-health/lab-analyzer/route.ts",
    [
      "runVision<any>(base64, mimeType, extractPrompt)",
      'runVision<any>(base64, mimeType, extractPrompt, "kyh.lab-analyzer")',
    ],
    [
      "runText<any>(prompt, INDIA_PREAMBLE)",
      'runText<any>(prompt, INDIA_PREAMBLE, "kyh.lab-analyzer")',
    ],
  ],
  [
    "src/app/api/know-your-health/diabetes-care/route.ts",
    [
      "runText<any>(prompt, INDIA_PREAMBLE)",
      'runText<any>(prompt, INDIA_PREAMBLE, "kyh.diabetes-care")',
    ],
  ],
  [
    "src/app/api/know-your-health/med-interaction/route.ts",
    [
      "runText<any>(prompt, INDIA_PREAMBLE)",
      'runText<any>(prompt, INDIA_PREAMBLE, "kyh.med-interaction")',
    ],
  ],
  [
    "src/app/api/know-your-health/health-quiz/route.ts",
    [
      "runText<any>(prompt, INDIA_PREAMBLE)",
      'runText<any>(prompt, INDIA_PREAMBLE, "kyh.health-quiz")',
    ],
  ],
  [
    "src/app/api/know-your-health/disease-risk/route.ts",
    [
      "runText<any>(prompt, INDIA_PREAMBLE)",
      'runText<any>(prompt, INDIA_PREAMBLE, "kyh.disease-risk")',
    ],
  ],
  [
    "src/app/api/know-your-health/sleep-quality/route.ts",
    [
      "runText<any>(prompt, INDIA_PREAMBLE)",
      'runText<any>(prompt, INDIA_PREAMBLE, "kyh.sleep-quality")',
    ],
  ],
  [
    "src/app/api/know-your-health/bp-analyzer/route.ts",
    [
      "runText<any>(prompt, INDIA_PREAMBLE)",
      'runText<any>(prompt, INDIA_PREAMBLE, "kyh.bp-analyzer")',
    ],
  ],
  [
    "src/app/api/know-your-health/mental-wellness/route.ts",
    [
      "runText<any>(prompt, INDIA_PREAMBLE)",
      'runText<any>(prompt, INDIA_PREAMBLE, "kyh.mental-wellness")',
    ],
  ],
  [
    "src/app/api/know-your-health/symptoms-checker/route.ts",
    [
      "runText<any>(prompt, INDIA_PREAMBLE)",
      'runText<any>(prompt, INDIA_PREAMBLE, "kyh.symptoms-checker")',
    ],
  ],
  [
    "src/app/api/know-your-health/diet-planner/route.ts",
    [
      "runText<any>(prompt, INDIA_PREAMBLE)",
      'runText<any>(prompt, INDIA_PREAMBLE, "kyh.diet-planner")',
    ],
  ],
  [
    "src/app/api/know-your-health/womens-care/route.ts",
    [
      "runText<any>(prompt, INDIA_PREAMBLE)",
      'runText<any>(prompt, INDIA_PREAMBLE, "kyh.womens-care")',
    ],
  ],
  [
    "src/app/api/know-your-health/derma-scan/route.ts",
    [
      "runVision<any>(base64, mimeType, prompt)",
      'runVision<any>(base64, mimeType, prompt, "kyh.derma-scan")',
    ],
  ],
  [
    "src/app/api/know-your-health/food-scan/route.ts",
    [
      "runVision<any>(base64, mimeType, prompt)",
      'runVision<any>(base64, mimeType, prompt, "kyh.food-scan")',
    ],
  ],
  [
    "src/app/api/know-your-health/xray-reader/route.ts",
    [
      "runVision<any>(base64, mimeType, prompt)",
      'runVision<any>(base64, mimeType, prompt, "kyh.xray-reader")',
    ],
  ],
  // ---- clinic / pharmacy / portal ----
  [
    "src/app/api/clinic/voice-soap/route.ts",
    [
      "runText<Record<string, unknown>>(transcript, SYSTEM_PROMPT)",
      'runText<Record<string, unknown>>(transcript, SYSTEM_PROMPT, "clinic.voice-soap")',
    ],
  ],
  [
    "src/app/api/pharmacy/voice-bill/route.ts",
    [
      "runText<{ items: unknown[]; raw?: string }>(transcript, SYSTEM_PROMPT)",
      'runText<{ items: unknown[]; raw?: string }>(transcript, SYSTEM_PROMPT, "pharmacy.voice-bill")',
    ],
  ],
  [
    "src/app/api/pharmacy/prescription-ocr/route.ts",
    [
      "runVision<OcrExtraction>(raw, mimeType, SYSTEM_PROMPT)",
      'runVision<OcrExtraction>(raw, mimeType, SYSTEM_PROMPT, "pharmacy.prescription-ocr")',
    ],
  ],
  [
    "src/app/api/pharmacy/ai-query/route.ts",
    ["runTextRaw(query, SYSTEM_PROMPT)", 'runTextRaw(query, SYSTEM_PROMPT, "pharmacy.ai-query")'],
  ],
  [
    "src/app/api/portal/ai-interpret/route.ts",
    [
      "runTextRaw(userPrompt, SYSTEM_PROMPT)",
      'runTextRaw(userPrompt, SYSTEM_PROMPT, "portal.ai-interpret")',
    ],
  ],
  [
    "src/app/api/assistant/route.ts",
    [
      'runChatText([{ role: "system", content: SYSTEM_PROMPT }, ...conversation])',
      'runChatText([{ role: "system", content: SYSTEM_PROMPT }, ...conversation], "portal.assistant")',
    ],
  ],
  // ---- nx/ai: 4 feature calls labelled with the runtime feature name ----
  [
    "src/app/api/nx/ai/route.ts",
    [
      "JSON.stringify(patientBlock)}`,\n        SYSTEM\n      );",
      "JSON.stringify(patientBlock)}`,\n        SYSTEM, `nx.ai.${feature}`\n      );",
    ],
    [
      'SBAR shift handover brief. JSON: {"headline": str, "stable": str[], "needsAttention": str[], "pendingTasks": str[], "handoverNotes": str[]}. Be concise; max 1 line per patient.\\n${JSON.stringify(compact)}`,\n        SYSTEM\n      );',
      'SBAR shift handover brief. JSON: {"headline": str, "stable": str[], "needsAttention": str[], "pendingTasks": str[], "handoverNotes": str[]}. Be concise; max 1 line per patient.\\n${JSON.stringify(compact)}`,\n        SYSTEM, `nx.ai.${feature}`\n      );',
    ],
    [
      "JSON.stringify(dischargeBlock)}`,\n        SYSTEM\n      );",
      "JSON.stringify(dischargeBlock)}`,\n        SYSTEM, `nx.ai.${feature}`\n      );",
    ],
    [
      'produce coordination recommendations (operational only — no clinical advice). JSON: {"headline": str, "actions": [{"area": str, "recommendation": str, "why": str}], "watchlist": str[]}.\\n${JSON.stringify(compact)}`,\n        SYSTEM\n      );',
      'produce coordination recommendations (operational only — no clinical advice). JSON: {"headline": str, "actions": [{"area": str, "recommendation": str, "why": str}], "watchlist": str[]}.\\n${JSON.stringify(compact)}`,\n        SYSTEM, `nx.ai.${feature}`\n      );',
    ],
  ],
];

let failures = 0;
for (const [file, ...pairs] of edits) {
  const src = fs.readFileSync(file, "utf8");
  let out = src;
  for (const [oldS, newS] of pairs) {
    const count = out.split(oldS).length - 1;
    if (count !== 1) {
      console.error(
        `FAIL ${file}: expected exactly 1 match, got ${count} for: ${oldS.slice(0, 80)}...`,
      );
      failures++;
      continue;
    }
    out = out.replace(oldS, newS);
  }
  if (out !== src) fs.writeFileSync(file, out);
}
if (failures > 0) {
  console.error(`${failures} replacement(s) failed — no commit should happen`);
  process.exit(1);
}
console.log("All capability labels applied (every replacement matched exactly once)");
