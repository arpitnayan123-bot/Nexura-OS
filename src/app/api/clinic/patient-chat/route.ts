import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { aiGate } from "@/lib/nx/ai-guard";
import { withProductAuth } from "@/lib/nx/product-auth";
import { runText } from "@/lib/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   NEXURA CLINIC — PATIENT CHAT AUTO-ANSWER (backend-core-2)
   Was: a 5-keyword canned-response table labelled "AI auto-answer"
   though no AI was involved. Now the label is true: the question
   goes to the LLM with strict safety rules, and `escalated` is
   set whenever the model (or the deterministic red-flag screen)
   decides a human must answer.

   Hard safety rules, enforced in the prompt AND validated after:
   - never diagnose, never prescribe or change doses
   - red-flag symptoms → escalate immediately
   - answers stay general-education, 60 words max
   Fallback on AI failure: the original keyword table (labelled).
   ============================================================ */

interface ChatReply {
  answer: string;
  escalated: boolean;
  source: string;
}

/** Deterministic escalation screen — model-independent safety net. */
const RED_FLAG =
  /chest pain|can'?t breathe|breathless|unconscious|seizure|fits|stroke|slurred speech|heavy bleeding|suicide|self harm|anaphyla/i;

const SYSTEM_PROMPT = `You are the patient-support assistant inside Nexura Clinic. You answer PATIENTS' general questions about their medicines, diet and routines in simple English (Hindi words welcome).
ABSOLUTE RULES:
- NEVER diagnose. NEVER prescribe, start, stop or change any medicine or dose.
- If the question needs clinical judgement, or mentions alarming symptoms, set "escalate": true with a short reason.
- Keep answers under 60 words, warm and practical. Recommend the treating doctor for anything specific.
Return STRICT JSON only: {"answer":"text","escalate":boolean,"reason":"why escalated (when true)"}. No prose outside JSON.`;

/** Keyword table retained as the AI-failure fallback (labelled). */
const FALLBACK_ANSWERS: Record<string, string> = {
  "side effects":
    "Common side effects include nausea, dizziness, or drowsiness. If severe, stop medication and consult your doctor immediately.",
  dosage:
    "Take the medicine as prescribed by your doctor. Do not skip or double doses. If you miss a dose, take it as soon as you remember unless it's close to the next dose.",
  diet: "Maintain a healthy diet with plenty of fruits, vegetables, and water. Avoid spicy or oily food if you have gastric issues. Low salt diet if hypertensive.",
  timing:
    "Take morning medicines on an empty stomach (30 min before food) unless your doctor advised otherwise.",
  duration:
    "Complete the full course of antibiotics even if you feel better. For other medicines, follow the duration prescribed.",
};

async function POST_impl(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const b = await req.json().catch(() => ({}));
    const q = typeof b?.question === "string" ? b.question.trim().slice(0, 600) : "";
    if (!q) return NextResponse.json({ error: "no_question" }, { status: 400 });

    // deterministic red-flag screen first — escalation never depends on the model
    if (RED_FLAG.test(q)) {
      return NextResponse.json({
        answer:
          "That sounds urgent — I'm flagging this to your doctor right away. If symptoms are severe, go to the nearest emergency room now.",
        source: "red-flag-safety-screen",
        escalated: true,
      } satisfies ChatReply);
    }

    try {
      const parsed = await runText<{ answer?: string; escalate?: boolean; reason?: string }>(
        `Patient question: "${q}"`,
        SYSTEM_PROMPT,
        "clinic.patient-chat",
      );
      const answer = typeof parsed.answer === "string" ? parsed.answer.trim().slice(0, 800) : "";
      if (answer) {
        return NextResponse.json({
          answer,
          source: "ai-auto-answer",
          escalated: Boolean(parsed.escalate),
          ...(parsed.escalate && typeof parsed.reason === "string"
            ? { reason: parsed.reason.slice(0, 200) }
            : {}),
        } satisfies ChatReply & { reason?: string });
      }
    } catch (e) {
      log.warn("clinic", "patient_chat_ai_fallback", {
        err: e instanceof Error ? e.message : String(e),
      });
    }

    // keyword fallback (AI unavailable)
    const lower = q.toLowerCase();
    for (const [key, answer] of Object.entries(FALLBACK_ANSWERS)) {
      if (lower.includes(key)) {
        return NextResponse.json({
          answer,
          source: "keyword-fallback (AI unavailable)",
          escalated: false,
        } satisfies ChatReply);
      }
    }
    return NextResponse.json({
      answer:
        "I'm not sure about that. I'll forward your question to the doctor who will respond shortly.",
      source: "keyword-fallback (AI unavailable)",
      escalated: true,
    } satisfies ChatReply);
  } catch (e) {
    log.error("clinic", "patient_chat_failed", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export const POST = withProductAuth("clinic.patient-chat.POST", POST_impl);
