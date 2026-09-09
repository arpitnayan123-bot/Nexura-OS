import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hospital = await db.hospital.findFirst({ select: { id: true } });
    if (!hospital) return NextResponse.json({ doctors: [] });
    const doctors = await db.hospitalDoctor.findMany({
      where: { hospitalId: hospital.id, active: true },
      select: { id: true, name: true, specialty: true, department: true },
      take: 10,
    });
    return NextResponse.json({ doctors });
  } catch {
    return NextResponse.json({ doctors: [] });
  }
}
