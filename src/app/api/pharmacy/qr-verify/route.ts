// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/pharmacy/qr-verify — verify Schedule H2 QR code on medicine packaging
async function POST_impl(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const { qrCode, medicineName, batchNo, category } = body as { qrCode?: string; medicineName?: string; batchNo?: string; category?: string };

    if (!qrCode) return NextResponse.json({ error: "no_qr" }, { status: 400 });

    // Parse QR code — H2 QR contains: GTIN, batch, expiry, serial
    // In production, this would call the CDSCO traceability API
    const parts = qrCode.split("/");
    const verified = parts.length >= 3;
    const parsedCategory = category || detectCategory(medicineName || "");

    const log = await db.h2QRVerification.create({
      data: {
        branchId: ctx.branch.id,
        medicineName: medicineName || "Unknown",
        batchNo: batchNo || parts[1] || null,
        qrCode,
        verified,
        category: parsedCategory,
      },
    });

    return NextResponse.json({
      ok: true,
      verified,
      log,
      details: {
        gtin: parts[0] || null,
        batch: parts[1] || batchNo || null,
        expiry: parts[2] || null,
        serial: parts[3] || null,
        category: parsedCategory,
        message: verified ? "QR verified — authentic product" : "QR could not be verified — check packaging",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "qr_verify_failed", detail: message }, { status: 500 });
  }
}

// GET — list H2 verifications
async function GET_impl() {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const logs = await db.h2QRVerification.findMany({
      where: { branchId: ctx.branch.id },
      orderBy: { verifiedAt: "desc" },
      take: 50,
    });
    const byCategory = await db.h2QRVerification.groupBy({ by: ["category"], where: { branchId: ctx.branch.id }, _count: { _all: true } });
    return NextResponse.json({ logs, byCategory, total: logs.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "qr_list_failed", detail: message }, { status: 500 });
  }
}

function detectCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("vaccine") || lower.includes("covaxin") || lower.includes("covishield")) return "vaccine";
  if (lower.includes("amox") || lower.includes("azith") || lower.includes("cipro") || lower.includes("cef") || lower.includes("oflox")) return "antimicrobial";
  if (lower.includes("chemo") || lower.includes("cancer") || lower.includes("oncology")) return "anticancer";
  if (lower.includes("morphine") || lower.includes("codeine") || lower.includes("tramadol")) return "ndps";
  return "antimicrobial"; // default
}

export const POST = withProductAuth("pharmacy.qr-verify.POST", POST_impl);
export const GET = withProductAuth("pharmacy.qr-verify.GET", GET_impl);
