import { NextRequest, NextResponse } from "next/server";
import { aiGate } from "@/lib/nx/ai-guard";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* AI SOAP Voice Generation
   Doctor speaks consultation in Hindi/regional language → AI transcribes,
   translates, structures into SOAP format with ICD-10 codes
   Inspired by DrChrono AI SOAP + India adaptation: multi-lingual voice input */

const SYSTEM_PROMPT = `You are the SOAP note structuring AI for Nexura OS clinic.
The doctor will speak or type their consultation in Hindi, Marathi, Tamil, or English.
Your job is to:
1. Understand the clinical content regardless of language
2. Structure it into SOAP format:
   - S (Subjective): chief complaint, duration, associated symptoms
   - O (Objective): vitals if mentioned (BP, pulse, temp, SpO₂, weight)
   - A (Assessment): diagnosis with ICD-10 code
   - P (Plan): medications with dosage, frequency, duration; advice; follow-up date
3. Output STRICT JSON only:
{
  "soap": {
    "chiefComplaint": "string",
    "vitals": { "bp": "string or null", "pulse": "number or null", "temp": "number or null", "spo2": "number or null", "weight": "number or null" },
    "diagnosis": "string",
    "icd10": "string (e.g. I10, E11.9, J18.9)",
    "medications": [{ "medicine": "string", "dosage": "string", "frequency": "string", "duration": "string" }],
    "advice": "string",
    "followUp": "string (date or null)"
  },
  "detectedLanguage": "Hindi|Marathi|Tamil|English|Other",
  "originalText": "cleaned version of what was said"
}

Common ICD-10 codes: Hypertension=I10, Diabetes Type 2=E11.9, Fever=R50.9, Common Cold=J00,
Acute Pharyngitis=J02.9, Pneumonia=J18.9, GERD=K21.9, Migraine=G43.0, Hypothyroidism=E03.9,
Asthma=J45.9, Anemia=D50.9, CAD=I25.1, Gastroenteritis=A09, Viral Fever=R50.9,
Depression=F32.9, Anxiety=F41.1, UTI=N39.0, Osteoarthritis=M19.9, Hypotension=I95.9

If the doctor mentions a diagnosis, always try to assign an ICD-10 code.
Return ONLY JSON, no prose.`;

// POST /api/clinic/voice-soap
async function POST_impl(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const body = await req.json().catch(() => ({}));
    const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";

    if (!transcript || transcript.length < 3) {
      return NextResponse.json({ error: "no_transcript" }, { status: 400 });
    }

    // Use LLM to structure the transcript into SOAP
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: SYSTEM_PROMPT },
        { role: "user", content: transcript },
      ],
      thinking: { type: "disabled" },
    });

    const content = completion.choices?.[0]?.message?.content?.trim() || "";

    // Extract JSON from response
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end <= start) {
      return NextResponse.json({
        error: "parse_failed",
        raw: content.slice(0, 500),
        message: "AI could not structure the input. Please speak more clearly.",
      });
    }

    let soap;
    try {
      soap = JSON.parse(content.slice(start, end + 1));
    } catch {
      return NextResponse.json({
        error: "json_parse_failed",
        raw: content.slice(0, 500),
        message: "AI response was not valid JSON. Please try again.",
      });
    }

    return NextResponse.json({
      ok: true,
      soap,
      processingTime: "<3s",
      engine: "z-ai-web-dev-sdk LLM",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "voice_soap_failed", detail: message }, { status: 500 });
  }
}

export const POST = withProductAuth("clinic.voice-soap.POST", POST_impl);
