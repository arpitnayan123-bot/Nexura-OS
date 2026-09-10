import { describe, it, expect } from "vitest";
import { evaluateAbac, inTimeWindow, type AbacPolicyShape } from "@/lib/nx/abac";
import { redactString, redactDeep } from "@/lib/nx/redact";
import { merkleRoot, leafHash } from "@/lib/nx/merkle";
import { confidenceHeuristic } from "@/lib/nx/ai-governance";
import { issueStepUpToken, verifyStepUpToken, inspectStepUpToken } from "@/lib/nx/stepup";

const P = (over: Partial<AbacPolicyShape>): AbacPolicyShape => ({
  id: "p1", role: "nurse", effect: "allow", deptScope: null, wardScope: null,
  patientScope: "any", timeWindows: null, action: "*", resource: "*", active: true, ...over,
});

describe("ABAC evaluator", () => {
  const session = { userId: "u1", role: "nurse", department: "ICU" } as const;

  it("allows by default when no policies exist (backward compatible)", () => {
    expect(evaluateAbac([], { session, action: "read", resource: "patients" }).allowed).toBe(true);
  });

  it("explicit deny wins over allow", () => {
    const policies = [
      P({ id: "allow", effect: "allow", role: null }),
      P({ id: "deny", effect: "deny", role: null, resource: "billing" }),
    ];
    const d = evaluateAbac(policies, { session, action: "read", resource: "billing" });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("deny:deny");
  });

  it("enforces patient-assignment scope", () => {
    const policies = [P({ patientScope: "assigned" })];
    const args = { session, action: "read" as const, resource: "patients" as const, target: { patientId: "x1" }, assignedPatientIds: ["y2"] };
    expect(evaluateAbac(policies, args).allowed).toBe(false);
    expect(evaluateAbac(policies, { ...args, assignedPatientIds: ["x1"] }).allowed).toBe(true);
  });

  it("enforces ward scope", () => {
    const policies = [P({ wardScope: JSON.stringify(["ICU"]) })];
    const args = { session, action: "read" as const, resource: "patients" as const, target: { ward: "GENERAL" } };
    expect(evaluateAbac(policies, args).allowed).toBe(false);
    expect(evaluateAbac(policies, { ...args, target: { ward: "ICU" } }).allowed).toBe(true);
  });

  it("blocks outside time windows incl. overnight windows", () => {
    const dayOnly = P({ timeWindows: JSON.stringify([{ days: [1, 2, 3, 4, 5], from: "09:00", to: "17:00" }]) });
    const tuesday10 = new Date("2026-09-08T10:00:00"); // Tue
    const tuesdayNight = new Date("2026-09-08T22:00:00");
    expect(inTimeWindow(dayOnly.timeWindows, tuesday10)).toBe(true);
    expect(inTimeWindow(dayOnly.timeWindows, tuesdayNight)).toBe(false);

    const overnight = P({ timeWindows: JSON.stringify([{ days: [1, 2, 3, 4, 5, 6, 7], from: "20:00", to: "07:30" }]) });
    expect(inTimeWindow(overnight.timeWindows, tuesdayNight)).toBe(true);
    expect(inTimeWindow(overnight.timeWindows, tuesday10)).toBe(false);
    const d = evaluateAbac([dayOnly], { session, action: "read", resource: "patients", now: tuesdayNight });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("default_deny");
  });

  it("department scope matches session department", () => {
    const policies = [P({ deptScope: JSON.stringify(["Cardiology"]) })];
    expect(evaluateAbac(policies, { session, action: "read", resource: "patients" }).allowed).toBe(false);
    expect(evaluateAbac(policies, { session: { ...session, department: "Cardiology" }, action: "read", resource: "patients" }).allowed).toBe(true);
  });
});

describe("PHI redaction", () => {
  it("masks UHIDs, phones, emails, ABHA ids", () => {
    const s = redactString("patient NEX-2024-00123 at +919876543210 mail r.k@example.com abha 12-3456-7890-1234");
    expect(s).not.toContain("NEX-2024-00123");
    expect(s).not.toContain("919876543210");
    expect(s).not.toContain("r.k@example.com");
    expect(s).not.toContain("12-3456-7890-1234");
    expect(s).toContain("•");
  });
  it("drops secret-like keys recursively", () => {
    const out = redactDeep({ password: "x", nested: { authorization: "Bearer t", note: "call +919812345678" } }) as Record<string, any>;
    expect(out.password).toBe("[redacted]");
    expect(out.nested.authorization).toBe("[redacted]");
    expect(out.nested.note).not.toContain("9812345678");
  });
});

describe("Merkle anchoring", () => {
  it("single leaf roots to itself-shaped hash; duplicate padding for odd counts", () => {
    const l1 = leafHash({ hash: "a", createdAt: new Date(0) });
    expect(merkleRoot([l1])).toBe(l1); // single level returns the leaf
    const l2 = leafHash({ hash: "b", createdAt: new Date(1000) });
    const two = merkleRoot([l1, l2]);
    const three = merkleRoot([l1, l2, l1]);
    expect(two).not.toBe(three); // odd leaf duplicates → different tree
    expect(two).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("AI confidence heuristic", () => {
  it("scores completeness of structured output", () => {
    const full = { a: "x", b: ["1"], c: { d: 1 } };
    expect(confidenceHeuristic(full)).toBeGreaterThan(0.9);
    const sparse = { a: "", b: [], c: null };
    expect(confidenceHeuristic(sparse)).toBeLessThan(0.5);
    expect(confidenceHeuristic("not json at all")).toBeLessThan(0.5);
  });
});

describe("Step-up tokens", () => {
  it("issues and verifies bound tokens; rejects wrong action/user/expiry", () => {
    const tok = issueStepUpToken("u1", "billing.approve", "order-9");
    expect(verifyStepUpToken(tok, "u1", "billing.approve", "order-9").ok).toBe(true);
    expect(verifyStepUpToken(tok, "u1", "medication.verify", "order-9").ok).toBe(false);
    expect(verifyStepUpToken(tok, "u2", "billing.approve", "order-9").ok).toBe(false);
    expect(verifyStepUpToken(tok, "u1", "billing.approve", "order-8").ok).toBe(false);
    expect(verifyStepUpToken("garbage", "u1", "billing.approve").ok).toBe(false);
  });
  it("inspects two-person flows and exposes the bound principal", () => {
    const prescriber = issueStepUpToken("doc-1", "prescription.sign", "rx-1");
    const verifier = issueStepUpToken("ph-1", "medication.verify", "rx-1");
    const p = inspectStepUpToken(prescriber, "prescription.sign", "rx-1");
    const v = inspectStepUpToken(verifier, "medication.verify", "rx-1");
    expect(p.ok && v.ok).toBe(true);
    expect(p.userId).toBe("doc-1");
    expect(v.userId).toBe("ph-1");
    expect(p.userId).not.toBe(v.userId);
  });
});
