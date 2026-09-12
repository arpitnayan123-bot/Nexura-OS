/* /api/diy/consent — granular grant / withdraw / status.
   Withdrawal stops future processing immediately: scopes are
   checked on EVERY protected call, and withdrawal is audited. */

import { NextRequest, NextResponse } from "next/server";
import { guard, zodBody } from "../_lib";
import { consentGrantSchema, consentWithdrawSchema } from "@/lib/diy/schemas";
import { db } from "@/lib/db";
import { getActiveConsentScopes } from "@/lib/diy/auth";
import { CONSENT_SCOPES, CONSENT_POLICY_VERSION, type ConsentScope } from "@/lib/diy/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PURPOSES: Record<ConsentScope, string> = {
  GOAL_PARSING: "Understand the wellness goals you type or speak",
  HEALTH_CONTEXT: "Personalize plans with the context you provide (age band, conditions, diet)",
  VOICE_PROCESSING: "Transcribe voice input into text for goal entry",
  VOICE_STORAGE: "Optionally keep your voice recordings (off by default)",
  PROGRESS_TRACKING: "Keep your daily tasks, check-ins and progress trends",
  REMINDERS: "Send task and check-in reminders",
  PLAN_GENERATION: "Generate your roadmap plans with AI assistance",
  PRODUCT_ANALYTICS: "Improve the product with de-identified usage events",
  MODEL_TRAINING: "Separate, explicit opt-in — never bundled — for training models on your data",
};

export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  const scopes = await getActiveConsentScopes(g.userId);
  const history = await db.diyConsent.findMany({
    where: { userId: g.userId },
    orderBy: { grantedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    scopes: CONSENT_SCOPES.map((s) => ({
      scope: s,
      purpose: PURPOSES[s],
      granted: scopes.has(s),
    })),
    history: history.map((h) => ({
      scope: h.consentType,
      grantedAt: h.grantedAt,
      withdrawnAt: h.withdrawnAt,
      policyVersion: h.policyVersion,
      source: h.source,
    })),
    policyVersion: CONSENT_POLICY_VERSION,
  });
}

export async function POST(req: NextRequest) {
  const g = await guard(req, {
    body: zodBody(consentGrantSchema),
    rate: { max: 20, windowMs: 60_000 },
  });
  if (g instanceof NextResponse) return g;

  const { scopes, policyVersion, source } = g.body as { scopes: ConsentScope[]; policyVersion: string; source: string };

  const created: string[] = [];
  for (const scope of scopes) {
    const prior = await db.diyConsent.findFirst({
      where: { userId: g.userId, consentType: scope },
      orderBy: { grantedAt: "desc" },
    });
    if (prior?.withdrawnAt) {
      const updated = await db.diyConsent.update({
        where: { id: prior.id },
        data: { withdrawnAt: null, grantedAt: new Date(), policyVersion, source },
      });
      created.push(updated.id);
    } else if (!prior) {
      const row = await db.diyConsent.create({
        data: {
          userId: g.userId,
          consentType: scope,
          purpose: PURPOSES[scope],
          scope,
          policyVersion,
          source,
        },
      });
      created.push(row.id);
    } else {
      created.push(prior.id); // already active
    }
  }

  return NextResponse.json({ ok: true, consentIds: created });
}

export async function DELETE(req: NextRequest) {
  const g = await guard(req, {
    body: zodBody(consentWithdrawSchema),
    rate: { max: 20, windowMs: 60_000 },
  });
  if (g instanceof NextResponse) return g;

  const { scopes } = g.body as { scopes: ConsentScope[] };
  const now = new Date();

  for (const scope of scopes) {
    await db.diyConsent.updateMany({
      where: { userId: g.userId, consentType: scope, withdrawnAt: null },
      data: { withdrawnAt: now },
    });
  }

  return NextResponse.json({ ok: true, withdrawn: scopes, effectiveAt: now.toISOString() });
}
