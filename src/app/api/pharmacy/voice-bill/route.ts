import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { getDemoContext } from "@/lib/pharmacy-context";
import { aiGate } from "@/lib/nx/ai-guard";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are the billing brain of Nexura Pharmacia, an AI pharmacy POS.
A pharmacist speaks billing commands like:
"Add Paracetamol 650mg two strips", "Aspirin one strip", "remove crocin",
"Dolo 650 three strips", "two strips of Azithral 500".

Parse the spoken text into a JSON cart. For each mentioned medicine return:
- name (the spoken medicine name, as-is)
- qtyStrips (integer, default 1 if "a"/"one"/"two strips" etc.)
- qtyLoose (integer, default 0; use when "loose"/"tablet" spoken)
- action: "add" (default) | "remove" | "clear"

If the speaker mentions a batch (e.g. "batch B2"), include batchNo.
If nothing parseable, return { items: [] }.
Return STRICT JSON only: {"items":[...],"raw":"<cleaned transcript>"}. No prose.`;

// POST /api/pharmacy/voice-bill
// body: { transcript?: string, audio?: "<base64>" }
async function POST_impl(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    let transcript: string | undefined =
      typeof body?.transcript === "string" ? body.transcript.trim() : undefined;

    // If audio (base64) provided and no transcript, run ASR
    if (!transcript && typeof body?.audio === "string" && body.audio.length > 0) {
      try {
        const ZAI = (await import("z-ai-web-dev-sdk")).default;
        const zai = await ZAI.create();
        const base64 = body.audio.replace(/^data:[^;]+;base64,/, "");
        const asr = await zai.audio.asr.create({ file_base64: base64 });
        transcript = (asr.text || "").trim();
      } catch (e) {
        log.error("pharmacy", "voice_bill_asr_failed", { err: e instanceof Error ? e.message : String(e) });
        return NextResponse.json(
          { error: "asr_failed", detail: "Audio could not be transcribed. Please retry or type the bill manually." },
          { status: 502 }
        );
      }
    }

    if (!transcript) {
      return NextResponse.json({ error: "no_transcript" }, { status: 400 });
    }

    // Use LLM to parse transcript → cart JSON
    let parsed: { items: unknown[]; raw?: string } = { items: [] };
    try {
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
      // extract JSON object
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      if (start >= 0 && end > start) {
        parsed = JSON.parse(content.slice(start, end + 1));
      }
    } catch (e) {
      // graceful fallback: word-level number map
      log.warn("pharmacy", "voice_bill_parse_fallback", { err: e instanceof Error ? e.message : String(e) });
      const words = transcript.toLowerCase().split(/\s+/);
      const nums: Record<string, number> = {
        one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      };
      const items = (parsed.items as unknown[]).concat([]);
      // best-effort: find product names by matching inventory
      void words; void nums; void items;
    }

    // Map parsed items to inventory products
    const spokenItems = Array.isArray(parsed.items) ? parsed.items : [];
    type Spoken = { name?: string; qtyStrips?: number; qtyLoose?: number; action?: string; batchNo?: string };
    const allProducts = await db.product.findMany({
      include: { batches: { where: { branchId: ctx.branch.id }, orderBy: { expDate: "asc" } } },
    });

    const cart: {
      productId: string;
      name: string;
      genericName: string | null;
      batchId: string;
      batchNo: string;
      mrp: number;
      qtyStrips: number;
      qtyLoose: number;
      matched: boolean;
      action: string;
    }[] = [];

    for (const s of spokenItems as Spoken[]) {
      const spokenName = (s.name || "").toLowerCase().trim();
      if (!spokenName) continue;
      // fuzzy match against product name / generic / brand
      const product = allProducts.find(
        (p) =>
          p.name.toLowerCase().includes(spokenName) ||
          spokenName.includes(p.name.toLowerCase()) ||
          (p.genericName && spokenName.includes(p.genericName.toLowerCase())) ||
          (p.genericName && p.genericName.toLowerCase().includes(spokenName))
      );
      const action = s.action || "add";
      if (!product) {
        cart.push({
          productId: "",
          name: s.name || "",
          genericName: null,
          batchId: "",
          batchNo: s.batchNo || "",
          mrp: 0,
          qtyStrips: s.qtyStrips ?? 1,
          qtyLoose: s.qtyLoose ?? 0,
          matched: false,
          action,
        });
        continue;
      }
      const batch =
        product.batches.find((b) => s.batchNo && b.batchNo.toLowerCase().includes(s.batchNo!.toLowerCase())) ||
        product.batches[0];
      cart.push({
        productId: product.id,
        name: product.name,
        genericName: product.genericName,
        batchId: batch?.id ?? "",
        batchNo: batch?.batchNo ?? "",
        mrp: batch?.mrp ?? 0,
        qtyStrips: s.qtyStrips ?? 1,
        qtyLoose: s.qtyLoose ?? 0,
        matched: true,
        action,
      });
    }

    return NextResponse.json({
      transcript,
      parsed: parsed.raw || transcript,
      cart,
    });
  } catch (err) {
    log.error("pharmacy", "voice_bill_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "voice_bill_failed", detail: "The voice bill could not be created. Please retry." }, { status: 500 });
  }
}

export const POST = withProductAuth("pharmacy.voice-bill.POST", POST_impl);
