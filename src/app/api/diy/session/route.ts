/* /api/diy/session — silent guest identity for sign-in-free DIY.
   POST: provision/reuse a guest (signed diy_guest JWT cookie over a
   real PortalUser row, rate-limited 8/h per IP). GET: report the
   current mode BY COOKIE TYPE (getDiyUser resolves guest rows too,
   which would misreport returning guests as portal). */

import { NextRequest, NextResponse } from "next/server";
import { rateLimit, ipOf, withRoute } from "@/lib/nx/api";
import { cookies } from "next/headers";
import { getPortalUser, PORTAL_SESSION_COOKIE } from "@/lib/portal-session";
import { DIY_GUEST_COOKIE, ensureGuestSession } from "@/lib/diy/auth";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute("diy.session.mode", async () => {
  const store = await cookies();
  const hasPortal = Boolean(store.get(PORTAL_SESSION_COOKIE)?.value);
  if (hasPortal) {
    const user = await getPortalUser({ id: true, fullName: true });
    if (user) return NextResponse.json({ mode: "portal", userId: user.id });
  }
  const guest = store.get(DIY_GUEST_COOKIE)?.value;
  if (guest) return NextResponse.json({ mode: "guest" });
  return NextResponse.json({ mode: "none" });
});

export const POST = withRoute("diy.session.guest", async (req: NextRequest) => {
  const ip = ipOf(req);
  const rl = rateLimit(`diy-session:${ip}`, 8, 60 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: { code: "DIY_029", message: "Too many session requests — try again later." } }, { status: 429 });
  }
  const store = await cookies();
  const hasPortal = Boolean(store.get(PORTAL_SESSION_COOKIE)?.value);
  if (hasPortal) {
    const user = await getPortalUser({ id: true, fullName: true });
    if (user) return NextResponse.json({ mode: "portal", userId: user.id });
  }
  const { created } = await ensureGuestSession();
  if (created) log.info("diy", "DIY guest session provisioned", {});
  return NextResponse.json({ mode: "guest" });
});
