import { NextRequest, NextResponse } from "next/server";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/clinic/abha — look up ABHA ID from ABDM registry (simulated)
// In production this calls the ABDM Health ID API (https://healthids.abdm.gov.in)
async function POST_impl(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const abhaId = typeof body?.abhaId === "string" ? body.abhaId.trim() : "";
    if (!abhaId || abhaId.length < 8) {
      return NextResponse.json({ error: "invalid_abha" }, { status: 400 });
    }

    // Simulated ABDM registry fetch — in production: GET https://healthids.abdm.gov.in/api/v1/healthid/{abhaId}
    // For demo, we deterministically derive a profile from the ABHA ID
    const hash = abhaId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const names = ["Rajesh Kumar", "Sunita Devi", "Mohammed Iqbal", "Priya Sharma", "Anand Menon", "Lakshmi Reddy"];
    const genders = ["male", "female"];
    const cities = ["Mumbai", "Pune", "Bengaluru", "Hyderabad", "Chennai", "Delhi"];
    const bloodGroups = ["A+", "B+", "O+", "AB+", "A-", "B-", "O-"];

    const profile = {
      abhaId,
      name: names[hash % names.length],
      gender: genders[hash % 2],
      age: 25 + (hash % 50),
      dob: `${1970 + (hash % 35)}-0${1 + (hash % 9)}-1${hash % 9}`,
      phone: `+91 9${String(8000000000 + hash).slice(0, 9)}`,
      address: `${100 + hash} ${["MG Road", "Linking Road", "Brigade Road", "Anna Salai"][hash % 4]}, ${cities[hash % cities.length]}`,
      bloodGroup: bloodGroups[hash % bloodGroups.length],
      source: "ABDM Registry (simulated)",
    };

    return NextResponse.json({ profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "abha_failed", detail: message }, { status: 500 });
  }
}

export const POST = withProductAuth("clinic.abha.POST", POST_impl);
