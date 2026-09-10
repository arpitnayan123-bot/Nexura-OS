import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPortalCaller } from "@/lib/portal-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getUser() {
  return getPortalCaller();
}

/**
 * GET /api/portal/family — list family members (self + members under my head)
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Self + family members where I am head OR I belong to a head
  const headId = user.familyHeadId ?? user.id;
  const [self, members] = await Promise.all([
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
  ]);

  return NextResponse.json({ self, members });
}

/**
 * POST /api/portal/family
 *   { fullName, phone, relation, dob, gender, bloodGroup }
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
    if (existing) {
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
    console.error("[portal/family] POST error", err);
    return NextResponse.json({ error: "Failed to add family member" }, { status: 500 });
  }
}
