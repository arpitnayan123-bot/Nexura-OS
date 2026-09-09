import { db } from "@/lib/db";

/**
 * Returns the first branch + its company for the pharmacy demo.
 * In production this would be derived from the logged-in staff session.
 */
export async function getDemoContext() {
  const branch = await db.pharmaBranch.findFirst({
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });
  if (!branch) return null;
  const staff = await db.pharmaStaff.findFirst({
    where: { branchId: branch.id },
  });
  return { branch, company: branch.company, staff };
}

export type DemoContext = Awaited<ReturnType<typeof getDemoContext>>;
