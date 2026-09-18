import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { guard, ok, withRoute } from "@/lib/nx/api";

/* Hospital-as-a-Service templates (white-label deployments). */
export const GET = withRoute("templates.list", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "settings.manage");
  if ("response" in g) return g.response;
  const templates = await db.nxHospitalTemplate.findMany({ orderBy: { code: "asc" } });
  return ok(
    templates.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      kind: t.kind,
      config: JSON.parse(t.configJson),
      whiteLabel: {
        branding: "tenant branding applies per hospital group",
        locales: "en|hi|ta|te|gu|mr built-in",
      },
    })),
    { requestId },
  );
});
