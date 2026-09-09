import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db";
import { audit } from "@/lib/nx/audit";
import { ok, withRoute } from "@/lib/nx/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Sign out of the CURRENT device: revokes this session record + clears cookie. */

export const POST = withRoute("auth.logout", async (req: NextRequest) => {
  const token = req.cookies.get("nx_access")?.value;
  const res = ok({ signedOut: true });
  res.cookies.set("nx_access", "", { httpOnly: true, path: "/", maxAge: 0 });
  if (token) {
    const decoded = verifyToken(token);
    const jti = decoded ? (decoded as { jti?: string }).jti : null;
    if (decoded && jti) {
      const rec = await db.nxSessionRecord.findUnique({ where: { jti } });
      if (rec && !rec.revokedAt) {
        await db.nxSessionRecord.update({ where: { id: rec.id }, data: { revokedAt: new Date(), revokedReason: "logout" } });
        const user = await db.nxStaffUser.findUnique({ where: { id: rec.userId } });
        if (user?.hospitalId) {
          await audit({
            hospitalId: user.hospitalId,
            actorName: user.staffCode,
            actorRole: user.role,
            action: "auth.logout",
            entityType: "nx_session",
            entityId: rec.id,
          });
        }
      }
    }
  }
  return res;
});
