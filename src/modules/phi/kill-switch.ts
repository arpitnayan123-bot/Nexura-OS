import "server-only";
import { db } from "@/lib/db";

/* ============================================================
   NEXURA PHI — KILL SWITCH
   A single system flag that disables producing NEW predictive
   results while keeping profile, intake, consent, trend storage,
   and clinician-summary of PAST assessments available. Used for
   incident response / ruleset rollback.
   ============================================================ */

const KILL_SWITCH_ID = "phi_kill_switch";

export async function getKillSwitch(): Promise<boolean> {
  const flag = await db.phiSystemFlag.findUnique({ where: { id: KILL_SWITCH_ID } });
  return flag?.value === "on";
}

export async function setKillSwitch(on: boolean): Promise<void> {
  await db.phiSystemFlag.upsert({
    where: { id: KILL_SWITCH_ID },
    create: { id: KILL_SWITCH_ID, value: on ? "on" : "off" },
    update: { value: on ? "on" : "off" },
  });
}
