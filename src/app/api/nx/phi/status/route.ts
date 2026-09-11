import { NextResponse } from "next/server";
import {
  PHI_CONTENT_VERSION,
  PHI_ENGINE_VERSION,
  PHI_RULESET_VERSION,
} from "@/modules/phi/contracts";
import { getKillSwitch } from "@/modules/phi/kill-switch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/nx/phi/status — PUBLIC engine status (no session needed).
   Lets the UI show which engine/ruleset/content versions are live and
   whether predictive results are currently disabled for safety review. */
export async function GET() {
  try {
    const killSwitch = await getKillSwitch();
    return NextResponse.json(
      {
        ok: true,
        data: {
          killSwitch,
          engineVersion: PHI_ENGINE_VERSION,
          rulesetVersion: PHI_RULESET_VERSION,
          contentVersion: PHI_CONTENT_VERSION,
          demo: true,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/status GET", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "Unexpected server error.", code: "server_error" }, { status: 500 });
  }
}
