import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRoute } from "@/lib/nx/api";
import { readSubject } from "@/modules/foresight/subject";

/* DELETE /api/nx/foresight/data — wipe every stored run for the
   subject. Irreversible, immediate, no soft-delete. */

export const dynamic = "force-dynamic";

export const DELETE = withRoute("nx.foresight.data.wipe", async () => {
  try {
    const subjectKey = await readSubject();
    if (!subjectKey) {
      return NextResponse.json({ ok: true, data: { deleted: 0 } });
    }
    const res = await db.foresightRun.deleteMany({ where: { subjectKey } });
    return NextResponse.json({ ok: true, data: { deleted: res.count } });
  } catch (err) {
    console.error("[foresight/data]", err);
    return NextResponse.json({ ok: false, error: "Delete failed — please retry" }, { status: 500 });
  }
});
