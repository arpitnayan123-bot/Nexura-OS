import { db } from "@/lib/db";

export async function getClinicContext() {
  const clinic = await db.clinic.findFirst({ orderBy: { createdAt: "asc" } });
  if (!clinic) return null;
  return { clinic };
}

export type ClinicContext = Awaited<ReturnType<typeof getClinicContext>>;
