#!/usr/bin/env node
/* Patch all 15 KYH route catch blocks to fall back to the offline engine
   instead of returning a bare 500 ("answer is not provided" bug). */
import { readFileSync, writeFileSync } from "fs";

const ROUTES = [
  ["symptoms-checker", ["offlineSymptomsChecker"], "offlineSymptomsChecker(typeof fbBody?.symptoms === \"string\" ? fbBody.symptoms : \"\")"],
  ["bp-analyzer", ["offlineBp"], "offlineBp(Array.isArray(fbBody?.readings) ? fbBody.readings : [])"],
  ["diabetes-care", ["offlineDiabetes"], "offlineDiabetes(Number(fbBody?.fastingSugar), Number(fbBody?.postMealSugar), fbBody?.hba1c ? Number(fbBody.hba1c) : undefined)"],
  ["disease-risk", ["offlineDiseaseRisk"], "offlineDiseaseRisk(fbBody)"],
  ["mental-wellness", ["offlineMentalWellness"], "offlineMentalWellness(fbBody?.phq9, fbBody?.gad7)"],
  ["sleep-quality", ["offlineSleep"], "offlineSleep(fbBody)"],
  ["med-interaction", ["offlineMedInteraction"], "offlineMedInteraction(Array.isArray(fbBody?.medications) ? fbBody.medications : [], Array.isArray(fbBody?.conditions) ? fbBody.conditions : [])"],
  ["lab-analyzer", ["offlineLab"], "offlineLab(Array.isArray(fbBody?.tests) ? fbBody.tests : [])"],
  ["diet-planner", ["offlineDiet"], "offlineDiet(fbBody)"],
  ["ayurveda", ["offlineAyurveda"], "offlineAyurveda(Array.isArray(fbBody?.answers) ? fbBody.answers : [])"],
  ["womens-care", ["offlineWomensCare"], "offlineWomensCare(String(fbBody?.concern || \"\"), String(fbBody?.symptoms || \"\"), fbBody)"],
  ["food-scan", ["offlineFoodScan"], "offlineFoodScan(String(fbBody?.mealType || \"\"))"],
  ["derma-scan", ["offlineDermaScan"], "offlineDermaScan()"],
  ["xray-reader", ["offlineXrayReader"], "offlineXrayReader(String(fbBody?.bodyPart || \"\"))"],
  ["health-quiz", ["offlineQuizGenerate", "offlineQuizScore"], null], // special-cased: GET + POST
];

const FALLBACK_COMMENT = `    // 10x OFFLINE FALLBACK — the tool must ALWAYS provide an answer.
    // The AI path above is unchanged; this replaces the old bare 500 with a
    // deterministic, India-calibrated guide result when AI is unavailable.`;

let patched = 0;
for (const [tool, fns, call] of ROUTES) {
  const path = `src/app/api/know-your-health/${tool}/route.ts`;
  let src = readFileSync(path, "utf8");

  if (src.includes("@/lib/kyh/offline-engine")) {
    console.log(`skip (already patched): ${tool}`);
    continue;
  }

  // 1. add import after the aiGate import line
  const importAnchor = src.indexOf(`from "@/lib/nx/ai-guard";`);
  if (importAnchor === -1) { console.error(`NO aiGate import in ${tool}`); continue; }
  const eol = src.indexOf("\n", importAnchor);
  const importLine = `\nimport { ${fns.join(", ")} } from "@/lib/kyh/offline-engine";`;
  src = src.slice(0, eol) + importLine + src.slice(eol);

  if (tool === "health-quiz") {
    // GET: replace quiz_gen 500 with offlineQuizGenerate()
    src = src.replace(
      /log\.error\("kyh", "quiz_gen_failed", \{ err: err instanceof Error \? err\.message : String\(err\) \}\);\s*return NextResponse\.json\(\s*\{\s*error: "quiz_gen_failed",\s*detail: "The quiz could not be generated\. Please retry\."\s*,?\s*\},\s*\{\s*status: 500 \},?\s*\);/s,
      `log.error("kyh", "quiz_gen_failed", { err: err instanceof Error ? err.message : String(err) });
    ${FALLBACK_COMMENT}
    return NextResponse.json(offlineQuizGenerate());`,
    );
    // POST: re-parse body, score locally
    src = src.replace(
      /log\.error\("kyh", "quiz_score_failed", \{ err: err instanceof Error \? err\.message : String\(err\) \}\);\s*return NextResponse\.json\(\s*\{\s*error: "quiz_score_failed",\s*detail: "The quiz could not be scored\. Please retry\."\s*,?\s*\},\s*\{\s*status: 500 \},?\s*\);/s,
      `log.error("kyh", "quiz_score_failed", { err: err instanceof Error ? err.message : String(err) });
    ${FALLBACK_COMMENT}
    const fbBody = await req.clone().json().catch(() => ({}));
    const fb = offlineQuizScore(
      Array.isArray(fbBody?.questions) ? fbBody.questions : [],
      fbBody?.answers && typeof fbBody.answers === "object" ? fbBody.answers : {},
    );
    if (fb) return NextResponse.json(fb);
    return NextResponse.json(
      { error: "quiz_score_failed", detail: "The quiz could not be scored. Please retry." },
      { status: 500 },
    );`,
    );
  } else {
    // generic: replace the FIRST `return NextResponse.json(` after `} catch (err) {`
    // up to its closing `);` with fallback + original 500 kept as last resort
    const catchIdx = src.indexOf("} catch (err) {");
    if (catchIdx === -1) { console.error(`NO catch in ${tool}`); continue; }
    const retStart = src.indexOf("return NextResponse.json(", catchIdx);
    if (retStart === -1) { console.error(`NO 500 return in ${tool}`); continue; }
    const statusIdx = src.indexOf("{ status: 500 }", retStart);
    const closeIdx = src.indexOf(");", statusIdx);
    if (statusIdx === -1 || closeIdx === -1) { console.error(`NO 500 close in ${tool}`); continue; }
    const originalReturn = src.slice(retStart, closeIdx + 2);
    const replacement = `${FALLBACK_COMMENT}
    const fbBody = await req.clone().json().catch(() => ({}));
    const fb = ${call};
    if (fb) return NextResponse.json(fb);
    ${originalReturn}`;
    src = src.slice(0, retStart) + replacement + src.slice(closeIdx + 2);
  }

  writeFileSync(path, src);
  patched++;
  console.log(`patched: ${tool}`);
}
console.log(`\nDONE: ${patched} routes patched`);
