import { describe, it, expect, vi } from "vitest";

/* ============================================================
   TOKEN & SESSION SECURITY PRIMITIVES
   Service-scope tokens (portal sessions) must never be
   confused with staff access tokens.
   ============================================================ */

describe("service tokens (portal sessions)", () => {
  it("signs and verifies a service-scoped token round-trip", async () => {
    const { signServiceToken, verifyServiceToken } = await import("@/lib/auth/jwt");
    const token = signServiceToken({ sub: "patient-1" }, "1h");
    const claims = verifyServiceToken<{ sub: string }>(token);
    expect(claims).not.toBeNull();
    expect(claims!.sub).toBe("patient-1");
    expect(claims!.scope).toBe("service");
  });

  it("rejects expired service tokens", async () => {
    const { signServiceToken, verifyServiceToken } = await import("@/lib/auth/jwt");
    const token = signServiceToken({ sub: "patient-1" }, "-1s");
    expect(verifyServiceToken(token)).toBeNull();
  });

  it("rejects tampered tokens", async () => {
    const { signServiceToken, verifyServiceToken } = await import("@/lib/auth/jwt");
    const token = signServiceToken({ sub: "patient-1" }, "1h");
    const [h, p, sig] = token.split(".");
    // flip a payload byte
    const forged = `${h}.${p.slice(0, -2)}xy.${sig}`;
    expect(verifyServiceToken(forged)).toBeNull();
    // forged signature
    expect(verifyServiceToken(`${h}.${p}.${sig.slice(0, -2)}xy`)).toBeNull();
  });

  it("never verifies an access token as a service token (scope enforcement)", async () => {
    const { generateAccessToken, verifyServiceToken } = await import("@/lib/auth/jwt");
    const access = generateAccessToken({ id: "staff-1", name: "Dr. Demo", role: "doctor" });
    expect(verifyServiceToken(access)).toBeNull();
  });
});

describe("environment posture", () => {
  it("defaults DEMO_MODE to OFF (secure-by-default)", async () => {
    vi.resetModules();
    const saved = process.env.DEMO_MODE;
    delete process.env.DEMO_MODE;
    try {
      const { env } = await import("@/lib/env");
      expect(env().values.DEMO_MODE).toBe(false);
    } finally {
      if (saved === undefined) delete process.env.DEMO_MODE;
      else process.env.DEMO_MODE = saved;
      vi.resetModules();
    }
  });

  it("enables demo mode only when explicitly true", async () => {
    vi.resetModules();
    const saved = process.env.DEMO_MODE;
    process.env.DEMO_MODE = "true";
    try {
      const { env } = await import("@/lib/env");
      expect(env().values.DEMO_MODE).toBe(true);
    } finally {
      if (saved === undefined) delete process.env.DEMO_MODE;
      else process.env.DEMO_MODE = saved;
      vi.resetModules();
    }
  });

  it("reports a production JWT secret misconfiguration as an error (not just a warning)", async () => {
    vi.resetModules();
    const savedSecret = process.env.JWT_SECRET;
    const savedNodeEnv = process.env.NODE_ENV;
    // NODE_ENV is typed read-only; tests legitimately mutate it.
    const procEnv = process.env as unknown as Record<string, string | undefined>;
    delete process.env.JWT_SECRET;
    procEnv.NODE_ENV = "production";
    try {
      const { env } = await import("@/lib/env");
      const report = env();
      expect(report.ok).toBe(false);
      expect(report.errors.some((e) => e.includes("JWT_SECRET"))).toBe(true);
    } finally {
      if (savedSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = savedSecret;
      procEnv.NODE_ENV = savedNodeEnv;
      vi.resetModules();
    }
  });
});
