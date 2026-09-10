import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { connectGate } from "@/lib/nx/connect-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = connectGate(req, { max: 120, windowMs: 60_000 });
  if (gate) return gate;
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
