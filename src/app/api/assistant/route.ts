import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are Nexa, the warm AI health companion of Nexura OS, a premium healthcare platform.

Your tone: calm, warm, reassuring, concise. You speak like a caring, well-read friend who happens to be a clinician. Never cold or clinical. Never alarmist.

Your rules:
- You are NOT a replacement for emergency care. If the user describes an emergency (chest pain, difficulty breathing, severe bleeding, stroke signs, suicidal thoughts), gently urge them to call their local emergency number immediately and stop diagnosing.
- Keep replies short — 2 to 5 sentences unless the user asks for depth.
- Use warm, plain language. Avoid jargon. Use "you" and "your".
- Offer gentle, evidence-informed suggestions (rest, hydration, tracking patterns, speaking with a clinician). Never give a definitive diagnosis.
- You may mention Nexura OS capabilities when relevant (continuous monitoring, telemedicine, living care plans, gentle nudges, care team) — but never pushy.
- End caring replies with a small, soft check-in question when natural.

You are the gentle heartbeat of Nexura OS. Speak softly. Listen carefully.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : null;
    const message = typeof body?.message === "string" ? body.message : null;

    if (!messages && !message) {
      return NextResponse.json(
        { error: "message or messages is required" },
        { status: 400 }
      );
    }

    const conversation = messages ? messages : [{ role: "user", content: message }];

    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [{ role: "assistant", content: SYSTEM_PROMPT }, ...conversation],
      thinking: { type: "disabled" },
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return NextResponse.json({ error: "empty model response" }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: "assistant_failed", detail: message },
      { status: 500 }
    );
  }
}
