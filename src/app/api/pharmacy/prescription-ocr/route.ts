import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";
import { aiGate } from "@/lib/nx/ai-guard";
import { isValidImageBase64 } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Read this doctor's prescription image. List every medicine name you can see.
Return STRICT JSON only: {"items":[{"name":"medicine name","dosage":"if visible","duration":"if visible"}],"notes":"any instructions"}. No prose.`;

// Same upload contract as the Know-Your-Health image routes: bounded size,
// validated base64, image mime only. (Previously unbounded — relied solely on
// the proxy's 13 MB body cap.)
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB original file
const MAX_BASE64_LEN = Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 1024;

// POST /api/pharmacy/prescription-ocr
// body: { image: "<base64 or dataURL>" }
export async function POST(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const image = typeof body?.image === "string" ? body.image : null;
    if (!image) {
      return NextResponse.json({ error: "no_image" }, { status: 400 });
    }

    const raw = image.replace(/^data:[^;]+;base64,/, "").trim();
    if (!raw || !isValidImageBase64(raw)) {
      return NextResponse.json({ error: "invalid_image", detail: "Upload a prescription photo (JPG or PNG, max 8MB)." }, { status: 400 });
    }
    if (raw.length > MAX_BASE64_LEN) {
      return NextResponse.json({ error: "image_too_large" }, { status: 413 });
    }

    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    // Build a clean data URL from validated base64 — mime derived from magic
    // bytes, never trusted from the client.
    let dataUrl: string;
    if (raw.startsWith("iVBOR")) {
      dataUrl = `data:image/png;base64,${raw}`;
    } else if (raw.startsWith("/9j/")) {
      dataUrl = `data:image/jpeg;base64,${raw}`;
    } else {
      return NextResponse.json({ error: "unsupported_mime", detail: "Only JPG and PNG prescriptions are supported." }, { status: 415 });
    }

    // The SDK auto-selects its VLM model at runtime when `model` is omitted —
    // the same proven shape as src/lib/openrouter.ts callZAI. Its published
    // types over-constrain (`model` "required"), so use a precise local type.
    type VisionBody = { messages: Array<{ role: string; content: Array<{ type: string; text?: string } | { type: string; image_url: { url: string } }> }>; thinking?: { type: "enabled" | "disabled" } };
    type VisionResult = { choices?: Array<{ message?: { content?: string } }> };
    const completion = await (zai.chat.completions.createVision as (b: VisionBody) => Promise<VisionResult>)({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SYSTEM_PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      thinking: { type: "disabled" },
    });

    const content = completion.choices?.[0]?.message?.content?.trim() || "";
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    let extracted: { items: { name: string; dosage?: string; duration?: string }[]; notes?: string } = {
      items: [],
    };
    if (start >= 0 && end > start) {
      try {
        extracted = JSON.parse(content.slice(start, end + 1));
      } catch {
        /* keep empty */
      }
    }

    // map extracted meds → inventory
    const allProducts = await db.product.findMany({
      include: { batches: { where: { branchId: ctx.branch.id }, orderBy: { expDate: "asc" } } },
    });

    const mapped = (extracted.items || []).map((m) => {
      const spoken = (m.name || "").toLowerCase().trim();
      const product = allProducts.find(
        (p) =>
          p.name.toLowerCase().includes(spoken) ||
          spoken.includes(p.name.toLowerCase()) ||
          (p.genericName && spoken.includes(p.genericName.toLowerCase())) ||
          (p.genericName && p.genericName.toLowerCase().includes(spoken))
      );
      const batch = product?.batches[0];
      return {
        requestedName: m.name,
        dosage: m.dosage,
        duration: m.duration,
        matched: !!product,
        productId: product?.id ?? "",
        name: product?.name ?? m.name,
        genericName: product?.genericName ?? null,
        batchId: batch?.id ?? "",
        batchNo: batch?.batchNo ?? "",
        mrp: batch?.mrp ?? 0,
        inStock: product ? product.batches.reduce((s, b) => s + b.stockStrips, 0) > 0 : false,
      };
    });

    return NextResponse.json({ items: mapped, notes: extracted.notes || "", raw: content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "ocr_failed", detail: message }, { status: 500 });
  }
}
