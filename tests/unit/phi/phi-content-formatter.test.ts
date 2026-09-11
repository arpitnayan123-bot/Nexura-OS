/* ============================================================
 * PHI-E2 — UNIT TESTS: content catalog + LLM formatter boundary
 * Pure parts only — NO DB access in tests:
 *  - contentRepo.resolve / resolveMany hit the DB for non-empty key
 *    lists, so only the empty-key-list path (no DB round-trip) is
 *    exercised here; everything else tested is a pure export.
 * ============================================================ */

import { describe, it, expect } from "vitest";
import { CATALOG } from "@/modules/phi/assessment/content-catalog";
import { contentRepo, isSafeRephrase, llmFormatter } from "@/modules/phi/assessment/engines";

const FORBIDDEN_MED_RE = /\bmg\b|\bmcg\b|dose|dosage/i;
const FORBIDDEN_DIAGNOSIS_RE = /\bdiagnos/i;

/* ---------------- isSafeRephrase (LLM safety boundary) ---------------- */

describe("isSafeRephrase", () => {
  const BASE = "Keep a 7-day home BP log and show it to a doctor.";

  it("accepts an identity rephrase", () => {
    expect(isSafeRephrase(BASE, BASE)).toBe(true);
  });

  it("accepts a genuine shortening", () => {
    expect(isSafeRephrase(BASE, "Keep a 7-day BP log for a doctor.")).toBe(true);
  });

  it("rejects urgency-raising phrases that were not in the original", () => {
    expect(isSafeRephrase(BASE, `${BASE} This is an emergency.`)).toBe(false);
    expect(isSafeRephrase(BASE, `${BASE} Call us urgently.`)).toBe(false);
    expect(isSafeRephrase(BASE, `${BASE} Call 108 now.`)).toBe(false);
    expect(isSafeRephrase(BASE, `${BASE} Do this immediately.`)).toBe(false);
  });

  it("catches urgency phrases case-insensitively", () => {
    expect(isSafeRephrase(BASE, `EMERGENCY: ${BASE}`)).toBe(false);
    expect(isSafeRephrase(BASE, `Go to a hospital IMMEDIATELY.`)).toBe(false);
  });

  it("allows urgency phrases only when the original already contained them", () => {
    const urgentOriginal = "If chest pain starts, treat it as an emergency and call 108.";
    expect(isSafeRephrase(urgentOriginal, "Emergency: call 108 if chest pain starts.")).toBe(true);
  });

  it("rejects output longer than 2x the original", () => {
    const original = "abcdefghij"; // 10 chars
    expect(isSafeRephrase(original, original.repeat(3))).toBe(false); // 30 chars, 3x
  });

  it("allows output at exactly 2x the original length", () => {
    const original = "abcdefghij"; // 10 chars
    expect(isSafeRephrase(original, original.repeat(2))).toBe(true); // 20 chars, exactly 2x
  });
});

/* ---------------- llmFormatter (deterministic) ---------------- */

describe("llmFormatter", () => {
  const ENGINE_TEXT =
    "Start with a daily 20-minute brisk walk (early morning or evening suits Indian heat), five days a week. " +
    "Add a second slot only when the first feels automatic. " +
    "Any activity counts — commuting on foot, household work, stairs. " +
    "A doctor can help you plan around other conditions.";

  it("detailed mode returns the text unchanged", () => {
    expect(llmFormatter.rephrase(ENGINE_TEXT, "detailed")).toBe(ENGINE_TEXT);
  });

  it("plain mode shortens while keeping the first sentence's meaning words", () => {
    const plain = llmFormatter.rephrase(ENGINE_TEXT, "plain");
    expect(plain.length).toBeLessThan(ENGINE_TEXT.length);
    expect(plain).toContain("brisk walk");
    expect(plain).toContain("five days a week");
    expect(plain).not.toBe(ENGINE_TEXT);
  });

  it("plain mode strips parentheticals", () => {
    const plain = llmFormatter.rephrase(ENGINE_TEXT, "plain");
    expect(plain).not.toContain("(");
    expect(plain).not.toContain(")");
    expect(plain).not.toContain("Indian heat"); // lived only inside the parenthetical
  });

  it("plain mode never introduces urgency phrases", () => {
    const plain = llmFormatter.rephrase(ENGINE_TEXT, "plain");
    expect(isSafeRephrase(ENGINE_TEXT, plain)).toBe(true);
  });
});

/* ---------------- content catalog (static, no DB) ---------------- */

describe("CATALOG", () => {
  it("has at least 10 content items", () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(10);
  });

  it("every item is an approved demo row with pending-review governance stamps", () => {
    for (const item of CATALOG) {
      expect(item.version).toBe("demo-1");
      expect(item.language).toBe("en");
      expect(item.status).toBe("approved");
      expect(item.reviewedBy).toBe("PENDING (demo)");
      expect(item.reviewedAt).toBe("2026-09-11");
      expect(item.jurisdiction).toBe("IN");
      expect(item.sourceAuthority).toBe("ICMR-NIN Dietary Guidelines for Indians 2024 (demo posture)");
      expect(item.sourceTitle.length).toBeGreaterThan(0);
      expect(item.category.length).toBeGreaterThan(0);
      expect(item.text.length).toBeGreaterThan(40);
    }
  });

  it("content keys are unique", () => {
    const keys = CATALOG.map((c) => c.contentKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("no catalog text makes diagnosis claims", () => {
    for (const item of CATALOG) {
      expect(item.text).not.toMatch(FORBIDDEN_DIAGNOSIS_RE);
      expect(item.sourceTitle).not.toMatch(FORBIDDEN_DIAGNOSIS_RE);
    }
  });

  it("no catalog text contains medication dose language", () => {
    for (const item of CATALOG) {
      expect(item.text).not.toMatch(FORBIDDEN_MED_RE);
    }
  });

  it("covers the required India-specific topics", () => {
    const keys = CATALOG.map((c) => c.contentKey);
    expect(keys).toContain("phi.hydration.summer");
    expect(keys).toContain("phi.portions.katori.guide");
    expect(keys).toContain("phi.protein.southindian");
    expect(keys).toContain("phi.plate.bloodsugar.indian");
    expect(keys).toContain("phi.cooking.bloodpressure");
    expect(keys).toContain("phi.sleep.shiftworkers");
    expect(keys).toContain("phi.activity.walking.beginners");
    expect(keys).toContain("phi.stress.reset.techniques");
    expect(keys).toContain("phi.labs.hba1c.followup");
    expect(keys).toContain("phi.safety.when.doctor");
  });
});

/* ---------------- content repo (pure paths only — no DB) ---------------- */

describe("contentRepo", () => {
  it("resolveMany with an empty key list returns an empty Map without touching the DB", async () => {
    const out = await contentRepo.resolveMany([]);
    expect(out).toBeInstanceOf(Map);
    expect(out.size).toBe(0);
  });

  // NOTE: contentRepo.resolve("nonexistent-key") -> { status: "placeholder" }
  // is intentionally NOT tested here: a non-empty key list performs a DB
  // round-trip and unit tests in this suite must stay DB-free. The
  // placeholder path is covered by the API-level (P3) tests.
});
