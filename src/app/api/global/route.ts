import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public API for the /global discovery page — no auth required */

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

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
  } catch (e: any) {
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

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: "inquiry_failed" }, { status: 500 });
  }
}
