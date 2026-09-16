import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";
import { log } from "@/lib/logger";
import { aiGate } from "@/lib/nx/ai-guard";
import { isValidImageBase64 } from "@/lib/gemini";
import { runVision } from "@/lib/openrouter";
import { withProductAuth } from "@/lib/nx/product-auth";

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
async function POST_impl(req: NextRequest) {
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

    // Mime derived from magic bytes, never trusted from the client — runVision
    // builds the data URL from the validated base64 + mime itself.
    let mimeType: string;
    if (raw.startsWith("iVBOR")) {
      mimeType = "image/png";
    } else if (raw.startsWith("/9j/")) {
      mimeType = "image/jpeg";
    } else {
      return NextResponse.json({ error: "unsupported_mime", detail: "Only JPG and PNG prescriptions are supported." }, { status: 415 });
    }

    // Canonical AI client: runVision runs the model and parses the STRICT JSON
    // reply with the shared robust parse (fence/prose-wrapped/trailing-comma
    // tolerant), replacing this route's old brace-slicing. A JSON.parse
    // failure surfaces as SyntaxError → graceful empty extraction (same 200
    // shape as before); provider/timeout/empty failures rethrow → 500
    // ocr_failed, exactly like the old SDK path.
    type OcrExtraction = { items: { name: string; dosage?: string; duration?: string }[]; notes?: string };
    let extracted: OcrExtraction = {
      items: [],
    };
    let rawOutput = "";
    try {
      extracted = await runVision<OcrExtraction>(raw, mimeType, SYSTEM_PROMPT);
      rawOutput = JSON.stringify(extracted);
    } catch (e) {
      if (e instanceof SyntaxError) {
        // keep empty — model returned no parseable JSON
        log.warn("pharmacy", "prescription_ocr_parse_fallback", { err: e.message });
      } else {
        throw e;
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

    return NextResponse.json({ items: mapped, notes: extracted.notes || "", raw: rawOutput });
  } catch (err) {
    log.error("pharmacy", "prescription_ocr_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "ocr_failed", detail: "The prescription could not be read. Please retry with a clearer photo." }, { status: 500 });
  }
}

export const POST = withProductAuth("pharmacy.prescription-ocr.POST", POST_impl);
