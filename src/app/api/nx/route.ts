import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/nx — machine-readable API catalog for the Hospital-OS layer.
   Previously this root returned a 19KB HTML 404; integrators (and smoke
   tests) now get a discoverable index. Every listed family keeps its own
   auth gates — this endpoint itself is public and reveals no data. */
const FAMILIES = [
  "abac",
  "ai",
  "analytics",
  "audit",
  "auth",
  "automations",
  "beds",
  "billing",
  "bio",
  "compliance",
  "dicom",
  "docs",
  "ed",
  "encounters",
  "escalations",
  "events",
  "fhir",
  "foresight",
  "gateway",
  "genomics",
  "hl7",
  "identity",
  "incidents",
  "insurance",
  "journey",
  "labs",
  "messages",
  "notes",
  "notifications",
  "offline",
  "onboard",
  "openapi",
  "or",
  "orders",
  "overview",
  "pathways",
  "patients",
  "permissions",
  "pharmacy",
  "plugins",
  "predict",
  "prefs",
  "prescriptions",
  "schedule",
  "search",
  "security",
  "simulations",
  "staff",
  "stream",
  "supply",
  "system",
  "system-status",
  "tasks",
  "telehealth",
  "templates",
  "tenants",
  "twin",
  "wearables",
  "webhooks",
  "workspace",
];

export async function GET() {
  return NextResponse.json({
    service: "nexura-hospital-os",
    api: "nx",
    version: "1.2.0",
    description:
      "Nexura Hospital OS API layer. Most families are session-gated (401 until you sign in via /api/nx/auth).",
    auth: {
      signIn: "POST /api/nx/auth — {email,password} or {staffCode,pin}",
      session: "GET /api/nx/auth — returns the session snapshot",
    },
    families: FAMILIES,
    docs: "/api/nx/openapi",
    health: "/api/health",
    readiness: "/api/ready",
  });
}
