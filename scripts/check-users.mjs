import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const users = await db.nxStaffUser.findMany({
  select: {
    email: true,
    staffCode: true,
    status: true,
    role: true,
    passwordHash: true,
    pinHash: true,
    failedAttempts: true,
    lockedUntil: true,
  },
});
for (const u of users) {
  console.log(
    JSON.stringify({
      email: u.email,
      staffCode: u.staffCode,
      status: u.status,
      role: u.role,
      hashLen: u.passwordHash?.length ?? 0,
      pinLen: u.pinHash?.length ?? 0,
      failed: u.failedAttempts,
      lockedUntil: u.lockedUntil,
    }),
  );
}
await db.$disconnect();
