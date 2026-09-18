import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/* ============================================================
   PRODUCT SURFACE AUTH CORE (backend-core-1)
   Clinic/pharmacy routes must resolve identity through
   resolveProductAuth: demo principal in DEMO_MODE, fresh
   revocation-aware staff session in production, 401 otherwise.
   ============================================================ */

const savedDemo = process.env.DEMO_MODE;

function req(path = "http://localhost:3000/api/clinic/patients"): NextRequest {
  return new NextRequest(path);
}

beforeAll(() => {
  // Deterministic module-level env cache in @/lib/env.
  process.env.DEMO_MODE = "true";
});

afterAll(() => {
  if (savedDemo === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = savedDemo;
  vi.resetModules();
});

/** Fresh module graph with DEMO_MODE forced to `value`
 *  (env() caches per module instance — reset before re-import). */
async function freshAuthWithDemo(value: "true" | "false") {
  process.env.DEMO_MODE = value;
  vi.resetModules();
  return import("@/lib/nx/product-auth");
}

describe("resolveProductAuth — demo mode", () => {
  it("issues a labeled demo principal for clinic surfaces", async () => {
    const { resolveProductAuth } = await import("@/lib/nx/product-auth");
    const res = await resolveProductAuth(req(), "clinic");
    expect("principal" in res && res.principal.kind === "demo").toBe(true);
    if ("principal" in res && res.principal.kind === "demo") {
      expect(res.principal.role).toBe("doctor");
      expect(res.principal.surface).toBe("clinic");
    }
  });

  it("issues a pharmacist principal for pharmacy surfaces", async () => {
    const { resolveProductAuth } = await import("@/lib/nx/product-auth");
    const res = await resolveProductAuth(req(), "pharmacy");
    if ("principal" in res && res.principal.kind === "demo") {
      expect(res.principal.role).toBe("pharmacist");
    } else throw new Error("expected demo principal");
  });
});

describe("resolveProductAuth — production policy", () => {
  it("returns 401 with no cookie when demo mode is off", async () => {
    const { resolveProductAuth } = await freshAuthWithDemo("false");
    const res = await resolveProductAuth(req(), "clinic");
    if ("response" in res) {
      expect(res.response.status).toBe(401);
      const body = (await res.response.json()) as { error?: string };
      expect(body.error).toBe("unauthenticated");
    } else throw new Error("expected 401 response, got a principal");
  });

  it("rejects a forged/expired staff cookie", async () => {
    const { resolveProductAuth } = await freshAuthWithDemo("false");
    const forged = req();
    forged.cookies.set("nx_access", "not.a.jwt");
    const res = await resolveProductAuth(forged, "clinic");
    if ("response" in res) expect(res.response.status).toBe(401);
    else throw new Error("forged token must not authenticate");
  });
});

describe("withProductAuth wiring", () => {
  it("wraps a handler and passes the demo principal through", async () => {
    const { withProductAuth } = await freshAuthWithDemo("true");
    let seenRole: string | null = null;
    const handler = withProductAuth("clinic.core1test.GET", async (_req, ctx) => {
      seenRole = ctx.principal.kind === "demo" ? ctx.principal.role : "other";
      return NextResponse.json({ ok: true }, { status: 200 });
    });
    const res = await handler(req(), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    expect(seenRole).toBe("doctor");
  });
});
