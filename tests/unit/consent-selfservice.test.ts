import { describe, it, expect, afterAll } from "vitest";
import {
  resolveConsentState,
  resolveAllConsentStates,
  SELF_SERVICE_CONSENT_TYPES,
  SELF_SERVICE_TYPE_IDS,
  type ConsentRowLike,
} from "@/lib/consent";
import { checkAiConsent } from "@/lib/nx/ai-governance";
import { db } from "@/lib/db";

/* Consent self-service — latest-event-wins state resolution and the AI
 * governance check that must honor withdrawal (revocation is real). */

const NOW = new Date("2026-09-17T10:00:00Z");
const d = (s: string) => new Date(s);

function row(
  partial: Omit<Partial<ConsentRowLike>, "grantedAt"> & { type: string; grantedAt: string }
): ConsentRowLike {
  return {
    status: "granted",
    withdrawnAt: null,
    expiresAt: null,
    ...partial,
    grantedAt: new Date(partial.grantedAt), // the resolver needs real Dates
  };
}

describe("resolveConsentState (latest-event-wins)", () => {
  it("never-consented → not_granted", () => {
    expect(resolveConsentState([], "ai_assist", NOW).state).toBe("not_granted");
  });

  it("granted → granted", () => {
    const r = resolveConsentState([row({ type: "ai_assist", grantedAt: "2026-09-01T00:00:00Z" })], "ai_assist", NOW);
    expect(r.state).toBe("granted");
    expect(r.lastEventAt).toEqual(d("2026-09-01T00:00:00Z"));
  });

  it("granted then WITHDRAWN → withdrawn (revocation is real)", () => {
    const r = resolveConsentState(
      [
        row({ type: "ai_assist", grantedAt: "2026-09-01T00:00:00Z" }),
        row({ type: "ai_assist", grantedAt: "2026-09-10T00:00:00Z", status: "withdrawn", withdrawnAt: d("2026-09-10T00:00:00Z") }),
      ],
      "ai_assist",
      NOW
    );
    expect(r.state).toBe("withdrawn");
  });

  it("withdrawn then granted AGAIN → granted", () => {
    const r = resolveConsentState(
      [
        row({ type: "ai_assist", grantedAt: "2026-09-01T00:00:00Z", status: "withdrawn" }),
        row({ type: "ai_assist", grantedAt: "2026-09-12T00:00:00Z" }),
      ],
      "ai_assist",
      NOW
    );
    expect(r.state).toBe("granted");
  });

  it("denied after granted → not_granted", () => {
    const r = resolveConsentState(
      [
        row({ type: "research", grantedAt: "2026-09-01T00:00:00Z" }),
        row({ type: "research", grantedAt: "2026-09-08T00:00:00Z", status: "denied" }),
      ],
      "research",
      NOW
    );
    expect(r.state).toBe("not_granted");
  });

  it("granted-but-expired → expired", () => {
    const r = resolveConsentState(
      [row({ type: "telemedicine", grantedAt: "2026-01-01T00:00:00Z", expiresAt: d("2026-06-01T00:00:00Z") })],
      "telemedicine",
      NOW
    );
    expect(r.state).toBe("expired");
  });

  it("other consent types never interfere", () => {
    const r = resolveConsentState(
      [
        row({ type: "treatment", grantedAt: "2026-09-14T00:00:00Z" }),
        row({ type: "research", grantedAt: "2026-09-13T00:00:00Z", status: "withdrawn" }),
      ],
      "ai_assist",
      NOW
    );
    expect(r.state).toBe("not_granted");
  });

  it("resolveAllConsentStates covers exactly the self-serviceable types", () => {
    const out = resolveAllConsentStates([], NOW);
    expect(Object.keys(out).sort()).toEqual([...SELF_SERVICE_TYPE_IDS].sort());
    // clinical/financial types are deliberately NOT self-serviceable
    expect(SELF_SERVICE_TYPE_IDS).not.toContain("treatment");
    expect(SELF_SERVICE_TYPE_IDS).not.toContain("financial");
    expect(SELF_SERVICE_CONSENT_TYPES.length).toBeGreaterThanOrEqual(4);
  });
});

describe("checkAiConsent against the real ledger", () => {
  let createdIds: string[] = [];
  let hospitalId = "";
  let patientId = "";

  afterAll(async () => {
    if (createdIds.length > 0) {
      await db.nxConsent.deleteMany({ where: { id: { in: createdIds } } }).catch(() => {});
    }
  });

  it("resolves the latest ai_assist/data_share event — grant, withdraw, re-grant", async () => {
    const hospital = await db.hospital.findFirst({ select: { id: true } });
    const patient = await db.hospitalPatient.findFirst({ select: { id: true }, where: { hospitalId: hospital!.id } });
    hospitalId = hospital!.id;
    patientId = patient!.id;

    const insert = (data: { type: string; status: string; grantedAt: Date; withdrawnAt?: Date | null }) =>
      db.nxConsent.create({ data: { hospitalId, patientId, patientUhid: "TEST-SS", recordedBy: "test", ...data } }).then((r) => {
        createdIds.push(r.id);
        return r;
      });
    // Inline cleanup keeps the seeded patient's real ledger intact the moment
    // the test finishes (afterAll is belt-and-braces if an assertion throws).
    const cleanup = async () => {
      if (createdIds.length > 0) await db.nxConsent.deleteMany({ where: { id: { in: createdIds } } });
      createdIds = [];
    };

    // grant ai_assist (future-timestamped so it is the newest event) → true
    await insert({ type: "ai_assist", status: "granted", grantedAt: new Date(Date.now() + 60_000) });
    expect(await checkAiConsent(hospitalId, patientId)).toBe(true);

    // withdraw (newest event) → must flip to false — the heart of self-service
    const w = await insert({ type: "ai_assist", status: "withdrawn", grantedAt: new Date(Date.now() + 120_000), withdrawnAt: new Date(Date.now() + 120_000) });
    expect(await checkAiConsent(hospitalId, patientId)).toBe(false);

    // re-grant via data_share (either type authorizes AI) → true again
    await insert({ type: "data_share", status: "granted", grantedAt: new Date(Date.now() + 180_000) });
    expect(await checkAiConsent(hospitalId, patientId)).toBe(true);

    // withdraw again via ai_assist newest → false
    await insert({ type: "ai_assist", status: "withdrawn", grantedAt: new Date(Date.now() + 240_000), withdrawnAt: new Date(Date.now() + 240_000) });
    expect(await checkAiConsent(hospitalId, patientId)).toBe(false);

    await cleanup();
  });
});
