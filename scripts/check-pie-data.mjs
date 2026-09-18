import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const hospital = await db.hospital.findFirst({ select: { id: true, name: true } });
const hp = await db.hospitalPatient.count({ where: hospital ? { hospitalId: hospital.id } : {} });
const twins = await db.pieTwinState.count();
const assessments = await db.pieRiskAssessment.count();
const protocols = await db.pieProtocol.count();
console.log(
  JSON.stringify({
    hospital: hospital?.name ?? null,
    hospitalPatients: hp,
    twins,
    assessments,
    protocols,
  }),
);
await db.$disconnect();
