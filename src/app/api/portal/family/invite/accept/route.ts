import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { getPortalCaller } from "@/lib/portal-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/portal/family/invite/accept — backend-core-1
   The INVITED person accepts a family invite from their own
   authenticated account. Body: { token }. The token is single-use,
   hashed at rest, and expires; the caller's phone must match the
   invite phone, so only the intended person can link themselves. */

export async function POST(req: NextRequest) {
  try {
    const user = await getPortalCaller();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

    const invite = await db.portalFamilyInvite.findUnique({
      where: { tokenHash: createHash("sha256").update(token, "utf8").digest("hex") },
    });
    if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invalid, expired, or already used invitation" },
        { status: 400 },
      );
    }
    if (user.phone !== invite.phone) {
      // Only the invited phone number can accept — no account hijacking.
      return NextResponse.json(
        { error: "This invitation was sent to a different phone number" },
        { status: 403 },
      );
    }
    if (user.familyHeadId && user.familyHeadId !== invite.headId) {
      return NextResponse.json(
        { error: "Account already belongs to another family" },
        { status: 409 },
      );
    }

    const [updated, inviteUpdate] = await Promise.all([
      db.portalUser.update({
        where: { id: user.id },
        data: {
          familyHeadId: invite.headId,
          relationToHead: invite.relation,
          isOnboarded: true,
        },
        select: { id: true, fullName: true, phone: true, relationToHead: true, familyHeadId: true },
      }),
      db.portalFamilyInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true, member: updated, inviteId: inviteUpdate.id });
  } catch (err) {
    log.error("portal", "family_invite_accept_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
}
