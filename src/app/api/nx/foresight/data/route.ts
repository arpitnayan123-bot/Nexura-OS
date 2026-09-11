import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readSubject } from "@/modules/foresight/subject";

/* DELETE /api/nx/foresight/data — wipe every stored run for the
   subject. Irreversible, immediate, no soft-delete. */

export const dynamic = "force-dynamic";

export async function DELETE() {
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
}
