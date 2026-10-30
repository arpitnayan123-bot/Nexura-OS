import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { runText, INDIA_PREAMBLE } from "@/lib/gemini";
import { aiGate } from "@/lib/nx/ai-guard";
import { offlineQuizGenerate, offlineQuizScore } from "@/lib/kyh/offline-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/know-your-health/health-quiz — generate 10 fresh questions
export async function GET(req: NextRequest) {
  const __ai = aiGate(req, { max: 6, windowMs: 5 * 60_000 });
  if (__ai) return __ai;
  try {
    const prompt = `Generate 10 fresh multiple-choice health quiz questions adapted for an Indian audience. Cover nutrition, hygiene, common diseases (diabetes, hypertension, dengue, TB), first aid, mental health, and lifestyle.
Return STRICT JSON only:
{
  "questions": [
    {
      "id": "q1",
      "question": "What is the normal fasting blood sugar range for adults?",
      "options": ["60-99 mg/dL", "100-125 mg/dL", "126-180 mg/dL", "200+ mg/dL"],
      "correctIndex": 0,
      "explanation": "1-2 sentence why",
      "topic": "Diabetes"
    }
  ]
}

Rules:
- Exactly 10 questions, ids q1..q10.
- 4 options each, only 1 correct.
- Mix of easy, medium, hard.
- Use Indian context (ICMR ranges, Indian foods, NFHS-5 stats).
- No markdown. JSON only.`;
    const result = await runText<any>(prompt, INDIA_PREAMBLE, "kyh.health-quiz");
    if (!Array.isArray(result?.questions) || result.questions.length === 0)
      throw new Error("invalid_response");
    return NextResponse.json(result);
  } catch (err) {
    log.error("kyh", "quiz_gen_failed", { err: err instanceof Error ? err.message : String(err) });
    // 10x OFFLINE FALLBACK — the tool must ALWAYS provide an answer.
    // The AI path above is unchanged; this replaces the old bare 500 with a
    // deterministic, India-calibrated guide result when AI is unavailable.
    return NextResponse.json(offlineQuizGenerate());
  }
}

// POST /api/know-your-health/health-quiz — score answers
export async function POST(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const body = await req.json().catch(() => ({}));
    const questions = Array.isArray(body?.questions) ? body.questions : [];
    const answers = body?.answers && typeof body.answers === "object" ? body.answers : {};
    if (!questions.length) return NextResponse.json({ error: "no_questions" }, { status: 400 });

    let score = 0;
    const results = questions.map((q: any) => {
      const userAnswer = answers[q.id];
      const isCorrect = typeof userAnswer === "number" && userAnswer === q.correctIndex;
      if (isCorrect) score++;
      return {
        question: q.question,
        options: q.options,
        userAnswer: typeof userAnswer === "number" ? userAnswer : -1,
        correctAnswer: q.correctIndex,
        isCorrect,
        explanation: q.explanation,
        topic: q.topic,
      };
    });

    const total = questions.length;
    const percentage = Math.round((score / total) * 100);
    let grade = "Needs improvement";
    if (percentage >= 90) grade = "Health expert!";
    else if (percentage >= 75) grade = "Health smart";
    else if (percentage >= 50) grade = "Getting there";

    return NextResponse.json({ score, total, percentage, grade, results });
  } catch (err) {
    log.error("kyh", "quiz_score_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    // 10x OFFLINE FALLBACK — the tool must ALWAYS provide an answer.
    // The scoring path above is unchanged; this replaces the old bare 500
    // with a deterministic local score when AI is unavailable.
    const fbBody = await req
      .clone()
      .json()
      .catch(() => ({}));
    const fb = offlineQuizScore(
      Array.isArray(fbBody?.questions) ? fbBody.questions : [],
      fbBody?.answers && typeof fbBody.answers === "object" ? fbBody.answers : {},
    );
    if (fb) return NextResponse.json(fb);
    return NextResponse.json(
      { error: "quiz_score_failed", detail: "The quiz could not be scored. Please retry." },
      { status: 500 },
    );
  }
}
