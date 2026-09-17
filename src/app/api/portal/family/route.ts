import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { getPortalCaller } from "@/lib/portal-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getUser() {
  return getPortalCaller();
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * GET /api/portal/family — list family members (self + members under my head)
 * plus this head's pending invites.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Self + family members where I am head OR I belong to a head
  const headId = user.familyHeadId ?? user.id;
  const [self, members, invites] = await Promise.all([
    db.portalUser.findUnique({
      where: { id: headId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        dob: true,
        gender: true,
        bloodGroup: true,
        address: true,
        city: true,
        abhaId: true,
        hospitalPatientUhid: true,
        relationToHead: true,
        familyHeadId: true,
      },
    }),
    db.portalUser.findMany({
      where: { familyHeadId: headId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        dob: true,
        gender: true,
        bloodGroup: true,
        relationToHead: true,
        familyHeadId: true,
        abhaId: true,
      },
    }),
    // Pending invites I (as head) sent — visible until accepted/expired.
    db.portalFamilyInvite.findMany({
      where: { headId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, phone: true, fullName: true, relation: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ self, members, invites });
}

/**
 * POST /api/portal/family
 *   { fullName, phone, relation, dob, gender, bloodGroup }
 *
 * backend-core-1 verified-invite policy:
 * - Phone matches NO user            → placeholder member created and
 *   attached (pre-registration flow, unchanged).
 * - Phone matches a hospital-created placeholder (isOnboarded=false)
 *   → attached as today.
 * - Phone matches an ONBOARDED user outside this family → a
 *   PortalFamilyInvite is created; the person must accept it from their
 *   own account with a one-time token. Their profile is NEVER modified
 *   by the requester. (Delivery channel in production: SMS/WhatsApp —
 *   requires an external provider account; email invitations go through
 *   src/lib/mailer.ts when a member has an email on file. The demo
 *   returns the token to the inviting UI.)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { fullName, phone, relation, dob, gender, bloodGroup } = body;
    if (!fullName || !phone || !relation) {
      return NextResponse.json({ error: "fullName, phone and relation are required" }, { status: 400 });
    }

    // The current user becomes the family head (if not already a member under someone else)
    const headId = user.familyHeadId ?? user.id;

    const existing = await db.portalUser.findUnique({ where: { phone } });

    if (existing && existing.isOnboarded && existing.familyHeadId !== headId) {
      // Verified invite path — never touch another user's profile directly.
      const token = randomBytes(24).toString("base64url");
      const invite = await db.portalFamilyInvite.create({
        data: {
          headId,
          phone,
          fullName: String(fullName).trim(),
          relation: String(relation).trim(),
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 7 * 24 * 3600_000),
        },
        select: { id: true, phone: true, fullName: true, relation: true, expiresAt: true },
      });
      // SMS/WhatsApp delivery needs an external provider account (honest
      // boundary); email invitations route through src/lib/mailer.ts when
      // the invited member has an address on file.
      return NextResponse.json({
        ok: true,
        invite: { ...invite, token },
        message: "Invitation created — the member must accept it from their own account.",
      });
    }

    if (existing) {
      // Own member (already under this head) or hospital-created placeholder.
      const updated = await db.portalUser.update({
        where: { id: existing.id },
        data: {
          fullName,
          dob,
          gender,
          bloodGroup,
          relationToHead: relation,
          familyHeadId: headId,
          isOnboarded: true,
        },
      });
      return NextResponse.json({ ok: true, member: updated });
    }

    const created = await db.portalUser.create({
      data: {
        fullName,
        phone,
        dob,
        gender,
        bloodGroup,
        relationToHead: relation,
        familyHeadId: headId,
        isOnboarded: true,
      },
    });
    return NextResponse.json({ ok: true, member: created });
  } catch (err) {
    log.error("portal", "family_member_add_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to add family member" }, { status: 500 });
  }
}
