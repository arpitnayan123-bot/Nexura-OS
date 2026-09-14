import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { getSessionFresh } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public API for the /global discovery page — no auth required.
 *  The coordinator DESK scope (?scope=desk + gated POST actions) is
 *  staff-only: demo mode keeps the demo desk working, production
 *  requires a fresh, revocation-aware staff session. */

/* ---------- Status flow (mirrors the desk client) ---------- */
const STATUS_FLOW = [
  "new",
  "estimate_sent",
  "appointment_booked",
  "visa_processing",
  "arrived",
  "treatment_ongoing",
  "discharged",
  "post_care",
] as const;

const ACTIVE_STATUSES = new Set<string>([
  "estimate_sent",
  "appointment_booked",
  "visa_processing",
  "arrived",
  "treatment_ongoing",
]);
const DONE_STATUSES = new Set<string>(["discharged", "post_care"]);

/** USD→INR estimate rate. Estimates only — overridden by a seeded
 *  CurrencyRate row when present, refreshed by ops. */
const FALLBACK_USD_INR = 88;

async function usdInrRate(): Promise<number> {
  try {
    const row = await db.currencyRate.findFirst({ orderBy: { fetchedAt: "desc" } });
    const parsed = row ? Number(JSON.parse(row.rates)?.USD_INR) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_USD_INR;
  } catch {
    return FALLBACK_USD_INR;
  }
}

/* ---------- Desk identity gate ---------- */
interface DeskPrincipal {
  kind: "demo" | "staff";
  actorName: string;
  actorRole: string;
}

async function deskGate(req: NextRequest): Promise<DeskPrincipal | null> {
  if (isDemoMode()) {
    return { kind: "demo", actorName: "Demo Coordinator", actorRole: "coordinator" };
  }
  const session = await getSessionFresh(req);
  // Clinical consoles are staff-only — portal/patient identities never
  // unlock the international desk.
  if (session && session.role !== "patient") {
    return {
      kind: "staff",
      actorName: session.name || "Staff",
      actorRole: session.role,
    };
  }
  return null;
}

function unauthorized() {
  return NextResponse.json(
    { error: "unauthenticated", detail: "Sign in as staff to use the international desk." },
    { status: 401 }
  );
}

/* ---------- Desk payload ---------- */
async function buildDeskPayload() {
  const [inquiries, procedures, coordinators, testimonials, settings] = await Promise.all([
    db.tourismInquiry.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    db.tourismProcedure.findMany({ where: { active: true }, orderBy: { priceUSD: "asc" } }),
    db.tourismCoordinator.findMany({ where: { active: true } }),
    db.tourismTestimonial.findMany({ where: { verified: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.tourismSetting.findFirst({ include: { hospital: { select: { id: true, name: true, city: true } } } }),
  ]);

  const kanban: Record<string, unknown[]> = {};
  for (const s of STATUS_FLOW) kanban[s] = [];
  for (const i of inquiries) if (kanban[i.status]) kanban[i.status].push(i);

  const totalInquiries = inquiries.length;
  const newInquiries = inquiries.filter((i) => i.status === "new").length;
  const activePatients = inquiries.filter((i) => ACTIVE_STATUSES.has(i.status)).length;
  const discharged = inquiries.filter((i) => DONE_STATUSES.has(i.status)).length;
  const totalRevenue = Math.round(
    inquiries.reduce((s, i) => s + (i.totalBilledUSD ?? i.estimatedCostUSD ?? 0), 0)
  );
  const conversionRate = totalInquiries > 0 ? Math.round((discharged / totalInquiries) * 100) : 0;

  const countryCounts = new Map<string, number>();
  for (const i of inquiries) {
    if (!i.patientCountry) continue;
    countryCounts.set(i.patientCountry, (countryCounts.get(i.patientCountry) || 0) + 1);
  }
  const topCountries = [...countryCounts.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const procCounts = new Map<string, number>();
  for (const i of inquiries) {
    if (!i.procedureInterest) continue;
    procCounts.set(i.procedureInterest, (procCounts.get(i.procedureInterest) || 0) + 1);
  }
  const topProcedures = [...procCounts.entries()]
    .map(([procedure, count]) => ({ procedure, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    settings,
    procedures,
    coordinators,
    inquiries,
    kanban,
    testimonials,
    stats: {
      totalInquiries,
      newInquiries,
      activePatients,
      discharged,
      totalRevenue,
      conversionRate,
      topCountries,
      topProcedures,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const scope = url.searchParams.get("scope");

    if (scope === "desk") {
      const principal = await deskGate(req);
      if (!principal) return unauthorized();
      const payload = await buildDeskPayload();
      return NextResponse.json({ ...payload, principalKind: principal.kind });
    }

    if (action === "hospitals") {
      const hospitals = await db.hospital.findMany({
        where: { tourismSetting: { tourismReady: true } },
        include: {
          tourismSetting: true,
          tourismProcedures: { where: { active: true }, take: 3, orderBy: { priceUSD: "asc" } },
          tourismTestimonials: { where: { verified: true }, take: 2, orderBy: { createdAt: "desc" } },
        },
      });
      return NextResponse.json({ hospitals });
    }

    if (action === "cost_comparison") {
      const comparison = [
        { procedure: "Coronary Bypass Surgery", india: 4500, usa: 130000, uk: 45000, uae: 25000 },
        { procedure: "Hip Replacement", india: 5800, usa: 40000, uk: 18000, uae: 15000 },
        { procedure: "Knee Replacement", india: 5200, usa: 35000, uk: 16000, uae: 14000 },
        { procedure: "IVF Treatment", india: 2200, usa: 15000, uk: 8000, uae: 6000 },
        { procedure: "Dental Implants (per tooth)", india: 800, usa: 5000, uk: 3000, uae: 2000 },
        { procedure: "Brain Tumor Surgery", india: 7500, usa: 150000, uk: 60000, uae: 35000 },
        { procedure: "Kidney Transplant", india: 14000, usa: 400000, uk: 100000, uae: 60000 },
        { procedure: "Liver Transplant", india: 35000, usa: 575000, uk: 200000, uae: 120000 },
        { procedure: "Gastric Bypass Surgery", india: 4500, usa: 25000, uk: 12000, uae: 9000 },
        { procedure: "Breast Cancer Surgery", india: 3800, usa: 20000, uk: 10000, uae: 8000 },
      ];
      return NextResponse.json({ comparison });
    }

    if (action === "testimonials") {
      const testimonials = await db.tourismTestimonial.findMany({
        where: { verified: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      });
      return NextResponse.json({ testimonials });
    }

    if (action === "hospital_detail") {
      const hospitalId = url.searchParams.get("hospitalId");
      if (!hospitalId) return NextResponse.json({ error: "hospitalId required" }, { status: 400 });

      const hospital = await db.hospital.findUnique({
        where: { id: hospitalId },
      });
      if (!hospital) return NextResponse.json({ error: "not_found" }, { status: 404 });

      const settings = await db.tourismSetting.findUnique({ where: { hospitalId } });
      const procedures = await db.tourismProcedure.findMany({ where: { hospitalId, active: true }, orderBy: { priceUSD: "asc" } });
      const doctors = await db.hospitalDoctor.findMany({ where: { hospitalId, active: true }, select: { id: true, name: true, specialty: true, regNo: true, department: true }, take: 12 });
      const testimonials = await db.tourismTestimonial.findMany({ where: { hospitalId, verified: true }, orderBy: { createdAt: "desc" }, take: 6 });

      return NextResponse.json({ hospital, settings, procedures, doctors, testimonials });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "global_failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    if (body.action === "submit_inquiry") {
      const hospital = await db.hospital.findFirst({
        where: { id: body.hospitalId },
        select: { id: true, name: true },
      });
      if (!hospital) return NextResponse.json({ error: "hospital_not_found" }, { status: 404 });

      const inq = await db.tourismInquiry.create({
        data: {
          hospitalId: hospital.id,
          patientName: body.name,
          patientEmail: body.email,
          patientPhone: body.phone,
          patientCountry: body.country,
          countryCode: body.countryCode,
          procedureInterest: body.procedure,
          conditionDesc: body.condition,
          status: "new",
          sourceUrl: "/global",
          messages: JSON.stringify([{ from: "patient", text: body.condition || "Inquiry from global discovery page", timestamp: new Date().toISOString() }]),
        },
      });

      return NextResponse.json({
        success: true,
        inquiryId: inq.id,
        message: `Thank you ${body.name}! Your inquiry has been submitted to ${hospital.name}. A coordinator will contact you within 24 hours.`,
      });
    }

    /* ---------- Staff-gated desk actions ---------- */

    if (body.action === "update_status") {
      const principal = await deskGate(req);
      if (!principal) return unauthorized();

      const inquiryId = typeof body.inquiryId === "string" ? body.inquiryId : "";
      const status = typeof body.status === "string" ? body.status : "";
      if (!inquiryId || !(STATUS_FLOW as readonly string[]).includes(status)) {
        return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
      }

      const inquiry = await db.tourismInquiry.findUnique({ where: { id: inquiryId } });
      if (!inquiry) return NextResponse.json({ error: "not_found" }, { status: 404 });

      let messages = inquiry.messages;
      try {
        const arr = messages ? JSON.parse(messages) : [];
        arr.push({
          from: "coordinator",
          text: `Status moved to ${status}`,
          timestamp: new Date().toISOString(),
        });
        messages = JSON.stringify(arr.slice(-100));
      } catch {
        messages = JSON.stringify([{ from: "coordinator", text: `Status moved to ${status}`, timestamp: new Date().toISOString() }]);
      }

      const updated = await db.tourismInquiry.update({
        where: { id: inquiry.id },
        data: { status, messages },
      });

      await audit({
        hospitalId: inquiry.hospitalId,
        actorName: principal.actorName,
        actorRole: principal.actorRole,
        action: "tourism.inquiry.status_update",
        entityType: "TourismInquiry",
        entityId: inquiry.id,
        detail: { from: inquiry.status, to: status },
      });

      return NextResponse.json({ inquiry: updated });
    }

    if (body.action === "generate_estimate") {
      const principal = await deskGate(req);
      if (!principal) return unauthorized();

      const procedureId = typeof body.procedureId === "string" ? body.procedureId : "";
      if (!procedureId) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

      const proc = await db.tourismProcedure.findUnique({ where: { id: procedureId } });
      if (!proc) return NextResponse.json({ error: "procedure_not_found" }, { status: 404 });

      const stayDays = Math.max(1, Math.min(180, Number(body.stayDays) || proc.avgStayDays));
      const extras = Array.isArray(body.extras)
        ? body.extras
            .filter((e: unknown): e is { name?: string; cost?: number } => !!e && typeof e === "object")
            .map((e: { name?: string; cost?: number }) => ({ name: String(e.name || "Extra"), cost: Math.max(0, Number(e.cost) || 0) }))
            .slice(0, 10)
        : [];

      // Estimate breakdown: procedure base price + extended stay
      // (per-day bed & care beyond the bundled avgStayDays) + extras.
      const rate = await usdInrRate();
      const extraStayDays = Math.max(0, stayDays - proc.avgStayDays);
      const perDayCare = 150;
      const extraStayCost = extraStayDays * perDayCare;
      const extrasCost = extras.reduce((s: number, e: { cost: number }) => s + e.cost, 0);
      const totalUSD = Math.round(proc.priceUSD + extraStayCost + extrasCost);
      const totalINR = Math.round(totalUSD * rate);

      return NextResponse.json({
        totalUSD,
        totalINR,
        rate,
        breakdown: {
          procedure: proc.name,
          baseUSD: proc.priceUSD,
          stayDays,
          bundledStayDays: proc.avgStayDays,
          extraStayDays,
          perDayCareUSD: perDayCare,
          extraStayCostUSD: extraStayCost,
          extras,
          extrasCostUSD: extrasCost,
        },
      });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "inquiry_failed" }, { status: 500 });
  }
}
