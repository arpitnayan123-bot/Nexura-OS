import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";
import { log } from "@/lib/logger";
import { withProductAuth } from "@/lib/nx/product-auth";
import {
  canTransition,
  isOnlineOrderStatus,
  nextActions,
  type OnlineOrderStatus,
} from "@/lib/pharmacy/online-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   NEXURA PHARMACY — ONLINE ORDER FULFILMENT
   PATCH /api/pharmacy/online-orders/[id]
   body: { status: <next>, note? }

   Enforces the order state machine (src/lib/pharmacy/online-orders.ts):
   pending_review → confirmed → preparing → ready → out_for_delivery → delivered
   (cancellable until out_for_delivery; delivered/cancelled terminal).

   On `confirmed` the branch's batch stock is checked for every
   catalog-matched line — shortages are reported inline as
   `stockWarnings` (order still confirms; the pharmacist resolves
   by sourcing from another batch/branch or calling the patient).
   Stock itself is NEVER decremented here — POS billing (Sale)
   remains the single inventory-movement source of truth.
   ============================================================ */

type RouteParams = { params: Promise<{ id: string }> };

interface StaffNamed {
  name?: string;
}

async function PATCH_impl(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const nextStatus = body?.status;
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 400) : null;

    if (!isOnlineOrderStatus(nextStatus)) {
      return NextResponse.json(
        { error: "invalid_status", allowed: nextActions("pending_review") },
        { status: 400 },
      );
    }

    const order = await db.pharmaOnlineOrder.findFirst({
      where: { id, branchId: ctx.branch.id },
      include: { items: true },
    });
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const from = order.status as OnlineOrderStatus;
    if (!canTransition(from, nextStatus)) {
      return NextResponse.json(
        { error: "invalid_transition", from, to: nextStatus, allowed: nextActions(from) },
        { status: 409 },
      );
    }

    // confirmation-time stock check for catalog-matched lines
    let stockWarnings: { productId: string; name: string; required: number; available: number }[] =
      [];
    if (nextStatus === "confirmed") {
      const matched = order.items.filter((i) => i.productId);
      if (matched.length > 0) {
        const batches = await db.productBatch.findMany({
          where: {
            branchId: ctx.branch.id,
            productId: { in: matched.map((i) => i.productId as string) },
          },
          select: { productId: true, stockStrips: true, stockLoose: true },
        });
        const available = new Map<string, number>();
        for (const b of batches) {
          available.set(
            b.productId,
            (available.get(b.productId) ?? 0) + b.stockStrips + Math.floor(b.stockLoose / 10),
          );
        }
        stockWarnings = matched
          .filter((i) => {
            const avail = available.get(i.productId as string) ?? 0;
            return avail < i.qtyStrips;
          })
          .map((i) => ({
            productId: i.productId as string,
            name: i.name,
            required: i.qtyStrips,
            available: available.get(i.productId as string) ?? 0,
          }));
      }
    }

    const actor = (ctx.staff as StaffNamed | null)?.name ?? "pharmacy-desk";
    const updated = await db.pharmaOnlineOrder.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        note: note ?? order.note,
        events: { create: { status: nextStatus, note, actor } },
      },
      include: { items: true, events: { orderBy: { createdAt: "desc" }, take: 5 } },
    });
    const { prescriptionImage: _img, ...updatedSafe } = updated;

    return NextResponse.json({
      ok: true,
      order: { ...updatedSafe, hasPrescriptionImage: Boolean(_img) },
      ...(stockWarnings.length > 0 ? { stockWarnings } : {}),
      source: "db",
    });
  } catch (e) {
    log.error("pharmacy", "online_orders_transition_failed", {
      err: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: "transition_failed" }, { status: 500 });
  }
}

export const PATCH = withProductAuth<{ id: string }>("pharmacy.online-orders.PATCH", PATCH_impl);
