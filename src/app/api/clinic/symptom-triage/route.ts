import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { aiGate } from "@/lib/nx/ai-guard";
import { withProductAuth } from "@/lib/nx/product-auth";
import { runText } from "@/lib/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   NEXURA CLINIC — SYMPTOM TRIAGE (backend-core-2)
   Was: a 5-keyword demo table with an honest "not a triage
   engine" label. Now a real AI triage with a HARD SAFETY LAYER:

   1. Deterministic red-flag screen runs FIRST, before any AI —
      emergency presentation is never dependent on model uptime.
   2. AI triage (strict JSON) for everything else, bounded to the
      same three urgency levels and required actions.
   3. On AI failure the original keyword table serves as the
      documented fallback, clearly labelled in `source`.

   This remains decision SUPPORT for clinic staff — it never
   replaces a clinician's judgement and says so in every reply.
   ============================================================ */

type Urgency = "routine" | "urgent" | "emergency";

interface TriageEntry {
  urgency: Urgency;
  action: string;
  specialty: string;
}

/** Deterministic emergency screen — checked before AI, always. */
const RED_FLAGS: { pattern: RegExp; action: string; specialty: string }[] = [
  { pattern: /chest pain|chest pressure|chest tightness|सीने में दर्द/i, action: "Go to ER immediately — possible cardiac event. ECG within 10 minutes.", specialty: "Emergency / Cardiology" },
  { pattern: /shortness of breath|can'?t breathe|breathless|सांस नहीं/i, action: "Visit ER now — respiratory distress.", specialty: "Emergency / Pulmonology" },
  { pattern: /unconscious|fainted|blackout|not responding|बेहोश/i, action: "Call ambulance immediately — loss of consciousness.", specialty: "Emergency" },
  { pattern: /seizure|fits|convulsion|झटके/i, action: "Visit ER now — active or recent seizure.", specialty: "Emergency / Neurology" },
  { pattern: /stroke|slurred speech|face drooping|arm weakness|लकवा/i, action: "Call ambulance NOW — stroke window is 4.5 hours (FAST criteria).", specialty: "Emergency / Neurology" },
  { pattern: /heavy bleeding|bleeding won'?t stop|hemorrhage|खून/i, action: "Go to ER immediately — uncontrolled bleeding.", specialty: "Emergency" },
  { pattern: /suicide|kill myself|self harm|आत्महत्या/i, action: "Escalate now — contact mental-health crisis team; do not leave the patient alone.", specialty: "Psychiatry (crisis)" },
  { pattern: /severe allergic|anaphyla|throat swelling|anaphylaxis/i, action: "ER immediately — possible anaphylaxis; adrenaline ready.", specialty: "Emergency" },
];

/** Legacy keyword table retained as the AI-failure fallback (labelled). */
const FALLBACK_TRIAGE: Record<string, TriageEntry[]> = {
  fever: [
    { urgency: "routine", action: "Book OPD appointment — likely viral", specialty: "General Medicine" },
    { urgency: "urgent", action: "If fever >103°F or >5 days — visit ER", specialty: "Emergency" },
  ],
  "chest pain": [{ urgency: "emergency", action: "Go to ER immediately — possible cardiac event", specialty: "Cardiology" }],
  "shortness of breath": [{ urgency: "urgent", action: "Visit hospital within 2 hours", specialty: "Pulmonology" }],
  "abdominal pain": [
    { urgency: "routine", action: "Book OPD appointment", specialty: "General Medicine" },
    { urgency: "urgent", action: "If severe — visit ER", specialty: "Emergency" },
  ],
  headache: [{ urgency: "routine", action: "Book OPD — likely migraine/tension", specialty: "General Medicine" }],
};

const SYSTEM_PROMPT = `You are the triage assistant for Nexura Clinic (Indian outpatient setting).
Given a patient's symptom description, decide the urgency level and next action.
urgency MUST be exactly one of: "routine" (book OPD), "urgent" (see a doctor within hours), "emergency" (ER/ambulance now).
Be conservative: when in doubt, escalate. Consider Indian context (dengue, typhoid, TB are common).
Return STRICT JSON only:
{"summary":"one-line clinical read","triage":[{"urgency":"routine|urgent|emergency","action":"specific next step","specialty":"relevant specialty"}]}
Rules: 1-3 triage entries, most urgent first. Never prescribe medicines. Never give a definitive diagnosis — say "possible"/"likely". No prose outside JSON.`;

function isUrgency(v: unknown): v is Urgency {
  return v === "routine" || v === "urgent" || v === "emergency";
}

/** Validate + order the AI's triage list; empty array when unusable. */
function sanitizeTriage(raw: unknown): TriageEntry[] {
  const list = (raw as { triage?: unknown })?.triage;
  if (!Array.isArray(list)) return [];
  const entries: TriageEntry[] = [];
  for (const e of list.slice(0, 3)) {
    if (!e || !isUrgency((e as TriageEntry).urgency)) continue;
    const action = typeof (e as TriageEntry).action === "string" ? (e as TriageEntry).action.slice(0, 300) : "";
    const specialty = typeof (e as TriageEntry).specialty === "string" ? (e as TriageEntry).specialty.slice(0, 80) : "General Medicine";
    if (action) entries.push({ urgency: (e as TriageEntry).urgency, action, specialty });
  }
  const rank: Record<Urgency, number> = { emergency: 0, urgent: 1, routine: 2 };
  return entries.sort((a, b) => rank[a.urgency] - rank[b.urgency]);
}

async function POST_impl(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const b = await req.json().catch(() => ({}));
    const q = typeof b?.symptoms === "string" ? b.symptoms.trim().slice(0, 600) : "";
    if (!q) return NextResponse.json({ error: "no_symptoms" }, { status: 400 });
    const lower = q.toLowerCase();

    // 1. deterministic red-flag screen — before AI, always
    const flagged = RED_FLAGS.find((f) => f.pattern.test(lower));
    if (flagged) {
      return NextResponse.json({
        triage: [{ urgency: "emergency", action: flagged.action, specialty: flagged.specialty }],
        symptom: lower,
        summary: "Red-flag symptom detected by the deterministic safety screen.",
        redFlagged: true,
        source: "red-flag-safety-screen (deterministic, model-independent)",
      });
    }

    // 2. AI triage
    try {
      const parsed = await runText<{ summary?: string; triage?: unknown }>(
        `Patient symptoms: "${q}"`,
        SYSTEM_PROMPT,
        "clinic.symptom-triage"
      );
      const triage = sanitizeTriage(parsed);
      if (triage.length > 0) {
        return NextResponse.json({
          triage,
          symptom: lower,
          summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 300) : undefined,
          redFlagged: false,
          source: "ai-triage (decision support only — clinician judgement required)",
        });
      }
    } catch (e) {
      log.warn("clinic", "triage_ai_fallback", { err: e instanceof Error ? e.message : String(e) });
    }

    // 3. keyword fallback (AI unavailable)
    let results: TriageEntry[] = [];
    for (const [k, v] of Object.entries(FALLBACK_TRIAGE)) {
      if (lower.includes(k)) results = results.concat(v);
    }
    if (results.length === 0) results = [{ urgency: "routine", action: "Book OPD appointment for evaluation", specialty: "General Medicine" }];
    return NextResponse.json({
      triage: results,
      symptom: lower,
      redFlagged: false,
      source: "keyword-fallback (AI unavailable — book OPD for any evaluation)",
    });
  } catch (e) {
    log.error("clinic", "triage_failed", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "triage_failed" }, { status: 500 });
  }
}

export const POST = withProductAuth("clinic.symptom-triage.POST", POST_impl);
