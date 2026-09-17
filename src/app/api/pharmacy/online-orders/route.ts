import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";
import { log } from "@/lib/logger";
import { aiGate } from "@/lib/nx/ai-guard";
import { isValidImageBase64 } from "@/lib/gemini";
import { runVision } from "@/lib/openrouter";
import { withProductAuth } from "@/lib/nx/product-auth";
import {
  estimateTotalPaise,
  generateOrderNo,
  matchCatalogItem,
  type CatalogCandidate,
} from "@/lib/pharmacy/online-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   NEXURA PHARMACY — ONLINE MEDICINE ORDERS (backend-core-2)
   Previously this endpoint returned a hardcoded empty array —
   the one true fake route in the pharmacy group. It is now a
   real DB-backed order book:

   GET   /api/pharmacy/online-orders            → branch order list
   POST  /api/pharmacy/online-orders            → place an order
           { patientName, phone, deliveryAddress?, note?,
             items?: [{ name, qtyStrips?, dosage? }],
             prescriptionImage?: "<base64|dataURL>" }

   When a prescription image is posted, the same bounded-upload +
   runVision OCR contract as /api/pharmacy/prescription-ocr reads
   the Rx and merges the extracted medicines into the order items.
   Items are matched to the branch catalog (Product) for pricing;
   unmatched lines stay free-text for pharmacist review.

   Fulfilment deliberately does NOT decrement stock here — the
   POS billing flow (Sale) remains the single source of truth for
   inventory movement and GST invoices.
   ============================================================ */

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // same contract as prescription-ocr
const MAX_BASE64_LEN = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 1024;

const OCR_PROMPT = `Read this doctor's prescription image. List every medicine name you can see.
Return STRICT JSON only: {"items":[{"name":"medicine name","dosage":"if visible","duration":"if visible"}],"notes":"any instructions"}. No prose.`;

type OcrExtraction = { items: { name: string; dosage?: string; duration?: string }[]; notes?: string };

/* ---------- helpers ---------- */

async function loadBranchCatalog(branchId: string): Promise<CatalogCandidate[]> {
  const products = await db.product.findMany({
    include: {
      batches: { where: { branchId }, orderBy: { expDate: "asc" } },
    },
  });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    genericName: p.genericName,
    // cheapest in-date batch MRP wins — honest quote, not optimistic
    unitMrp: p.batches.length > 0 ? Math.min(...p.batches.map((b) => b.mrp)) : 0,
  }));
}

interface IncomingItem {
  name: string;
  qtyStrips: number;
  dosage?: string;
}

/** Coerce the client item array into safe shapes (never trust quantities). */
function sanitizeItems(raw: unknown): IncomingItem[] {
  if (!Array.isArray(raw)) return [];
  const items: IncomingItem[] = [];
  for (const it of raw.slice(0, 25)) {
    const name = typeof it?.name === "string" ? it.name.trim().slice(0, 160) : "";
    if (!name) continue;
    const qtyRaw = Number(it?.qtyStrips ?? 1);
    const qtyStrips = Number.isFinite(qtyRaw) ? Math.min(50, Math.max(1, Math.floor(qtyRaw))) : 1;
    const dosage = typeof it?.dosage === "string" ? it.dosage.trim().slice(0, 120) : undefined;
    items.push({ name, qtyStrips, dosage });
  }
  return items;
}

/** Validate the optional Rx upload; returns null when absent, throws shapes on bad input. */
function extractImage(image: unknown): { ok: true; raw: string; mime: string } | { ok: true; raw: null } | { ok: false; status: number; code: string; detail: string } {
  if (typeof image !== "string" || !image.trim()) return { ok: true, raw: null };
  const raw = image.replace(/^data:[^;]+;base64,/, "").trim();
  if (!raw || !isValidImageBase64(raw)) {
    return { ok: false, status: 400, code: "invalid_image", detail: "Upload a prescription photo (JPG or PNG, max 8MB)." };
  }
  if (raw.length > MAX_BASE64_LEN) {
    return { ok: false, status: 413, code: "image_too_large", detail: "Prescription image exceeds 8MB." };
  }
  let mime: string;
  if (raw.startsWith("iVBOR")) mime = "image/png";
  else if (raw.startsWith("/9j/")) mime = "image/jpeg";
  else return { ok: false, status: 415, code: "unsupported_mime", detail: "Only JPG and PNG prescriptions are supported." };
  return { ok: true, raw, mime };
}

/* ---------- GET: branch order book ---------- */

async function GET_impl(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });

    const statusFilter = new URL(req.url).searchParams.get("status");
    const orders = await db.pharmaOnlineOrder.findMany({
      where: {
        branchId: ctx.branch.id,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        items: { orderBy: { id: "asc" } },
        events: { orderBy: { createdAt: "desc" }, take: 1 },
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { placedAt: "desc" },
      take: 100,
    });

    const counts = await db.pharmaOnlineOrder.groupBy({
      by: ["status"],
      where: { branchId: ctx.branch.id },
      _count: { _all: true },
    });
    const statusCounts: Record<string, number> = {};
    for (const c of counts) statusCounts[c.status] = c._count._all;

    // never ship the multi-MB base64 Rx images in list payloads — the UI
    // fetches the image on demand via the single-order route if needed
    const safeOrders = orders.map(({ prescriptionImage: _img, ...o }) => ({
      ...o,
      hasPrescriptionImage: Boolean(_img),
    }));

    return NextResponse.json({
      orders: safeOrders,
      statusCounts,
      branch: { id: ctx.branch.id, name: ctx.branch.name },
      source: "db",
    });
  } catch (e) {
    log.error("pharmacy", "online_orders_list_failed", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
}

/* ---------- POST: place an order ---------- */

async function POST_impl(req: NextRequest) {
  // AI rate-limit gate applies only when an Rx image is attached (OCR burn);
  // plain item orders are cheap DB writes and skip the AI budget.
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const hasImage = typeof body?.prescriptionImage === "string" && body.prescriptionImage.trim().length > 0;
  if (hasImage) {
    const __ai = aiGate(req);
    if (__ai) return __ai;
  }

  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });

    const patientName = typeof body?.patientName === "string" ? body.patientName.trim().slice(0, 120) : "";
    const phone = typeof body?.phone === "string" ? body.phone.replace(/[^\d+]/g, "").slice(0, 16) : "";
    const deliveryAddress = typeof body?.deliveryAddress === "string" ? body.deliveryAddress.trim().slice(0, 400) : null;
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 400) : null;

    if (patientName.length < 2) return NextResponse.json({ error: "no_patient_name" }, { status: 400 });
    if (phone.length < 8) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

    // optional Rx upload → validated + OCR'd
    const img = extractImage(body?.prescriptionImage);
    if (!img.ok) return NextResponse.json({ error: img.code, detail: img.detail }, { status: img.status });

    let ocrItems: { name: string; dosage?: string; duration?: string }[] = [];
    let ocrRawJson: string | null = null;
    if (img.raw && img.mime) {
      try {
        const extracted = await runVision<OcrExtraction>(img.raw, img.mime, OCR_PROMPT, "pharmacy.online-orders");
        ocrItems = (extracted.items || []).filter((i) => i && typeof i.name === "string" && i.name.trim()).slice(0, 25);
        ocrRawJson = JSON.stringify(extracted);
      } catch (e) {
        if (e instanceof SyntaxError) {
          // model returned no parseable JSON — order is still placed; pharmacist reads the image
          log.warn("pharmacy", "online_orders_ocr_parse_fallback", { err: e.message });
        } else {
          throw e;
        }
      }
    }

    // merge client items + OCR items (dedupe by normalized name)
    const merged: IncomingItem[] = [...sanitizeItems(body?.items)];
    for (const o of ocrItems) {
      const name = o.name.trim();
      if (!merged.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
        merged.push({ name, qtyStrips: 1, dosage: o.dosage });
      }
    }
    if (merged.length === 0) {
      return NextResponse.json({ error: "no_items", detail: "Add medicines or attach a prescription photo." }, { status: 400 });
    }

    const catalog = await loadBranchCatalog(ctx.branch.id);
    const orderLines = merged.map((m) => {
      const match = matchCatalogItem(m.name, catalog);
      return {
        name: m.name,
        dosage: m.dosage ?? null,
        qtyStrips: m.qtyStrips,
        matched: Boolean(match),
        productId: match?.productId ?? null,
        unitMrp: match?.unitMrp ?? 0,
      };
    });
    const estimatedTotal = estimateTotalPaise(orderLines.map((l) => ({ qtyStrips: l.qtyStrips, unitMrp: l.unitMrp })));

    // find-or-create the customer by phone (same identity the POS uses)
    const existingCustomer = await db.customer.findFirst({ where: { phone } });
    const customer = existingCustomer
      ? await db.customer.update({ where: { id: existingCustomer.id }, data: { name: patientName, ...(deliveryAddress ? { address: deliveryAddress } : {}) } })
      : await db.customer.create({ data: { name: patientName, phone, address: deliveryAddress } });

    const created = await db.pharmaOnlineOrder.create({
      data: {
        orderNo: generateOrderNo(),
        branchId: ctx.branch.id,
        customerId: customer.id,
        patientName,
        phone,
        deliveryAddress,
        prescriptionImage: img.raw,
        ocrItemsJson: ocrRawJson,
        status: "pending_review",
        note,
        estimatedTotal,
        items: { create: orderLines },
        events: { create: { status: "pending_review", note: "Order placed", actor: "patient" } },
      },
      include: { items: true, events: true },
    });

    const { prescriptionImage: _img, ...createdSafe } = created;
    return NextResponse.json({
      ok: true,
      order: { ...createdSafe, hasPrescriptionImage: Boolean(_img) },
      ocr: ocrItems.length > 0 ? { extracted: ocrItems.length, merged: true } : { extracted: 0, merged: false },
      source: "db",
    }, { status: 201 });
  } catch (e) {
    log.error("pharmacy", "online_orders_create_failed", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}

export const GET = withProductAuth("pharmacy.online-orders.GET", GET_impl);
export const POST = withProductAuth("pharmacy.online-orders.POST", POST_impl);
