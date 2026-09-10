import { db } from "@/lib/db";

/* Event sourcing / CQRS-lite backbone. Append-only, per-aggregate
   monotonic seq. Command Center + Scheduling projections can replay
   this stream; the same stream feeds partner audit and demos. */
export async function appendEvent(hospitalId: string, aggregateType: string, aggregateId: string, type: string, payload?: Record<string, unknown>, actorName?: string): Promise<void> {
  try {
    const last = await db.nxEventLog.findFirst({
      where: { hospitalId, aggregateType, aggregateId },
      orderBy: { seq: "desc" },
      select: { seq: true },
    });
    await db.nxEventLog.create({
      data: {
        hospitalId, aggregateType, aggregateId, type,
        seq: (last?.seq ?? 0) + 1,
        payloadJson: payload ? JSON.stringify(payload).slice(0, 4000) : null,
        actorName,
      },
    });
  } catch {
    // never block the command path on telemetry
  }
}
