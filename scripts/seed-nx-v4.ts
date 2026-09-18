/**
 * NEXURA HOSPITAL OS — Demo Seed v4 (idempotent)
 * Adds: organization, departments, v4 demo accounts (10 roles incl. patient),
 * emails + passwords on all staff, feature flags, system status, notifications,
 * consents, MAR entries, charges/payments, vendor + PO, credentials, shifts,
 * waitlist, channels. Safe to re-run (upserts by natural keys).
 *
 * Run: bun scripts/seed-nx-v4.ts
 * Demo password for every account: Demo@12345 · Legacy PIN: 2468
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/* Demo-seed guard: demo seeds write synthetic patients/staff with known
   passwords and demo API keys — they must never run against a production
   database by accident. Override requires an explicit, intentional flag. */
if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO_OVERRIDE !== "true") {
  console.error(
    "[seed] Refusing to seed demo data: NODE_ENV=production. If this is genuinely intentional, re-run with SEED_DEMO_OVERRIDE=true.",
  );
  process.exit(1);
}

const db = new PrismaClient();
const DEMO_PW = "Demo@12345";

const NEW_ACCOUNTS = [
  {
    staffCode: "SA.DEV",
    name: "Devika Rao",
    role: "admin",
    email: "superadmin@demo.nexura.health",
    department: "Platform",
    speciality: "Platform Super Admin",
  },
  {
    staffCode: "RC.MEERA",
    name: "Meera Iyer",
    role: "reception",
    email: "reception@demo.nexura.health",
    department: "Front Desk",
  },
  {
    staffCode: "BILL.ARVIND",
    name: "Arvind Gupta",
    role: "billing",
    email: "billing@demo.nexura.health",
    department: "Revenue Cycle",
  },
  {
    staffCode: "RAD.INDER",
    name: "Inder Malhotra",
    role: "radiology",
    email: "radiology@demo.nexura.health",
    department: "Radiology",
  },
  {
    staffCode: "INV.GANESH",
    name: "Ganesh Shetty",
    role: "inventory",
    email: "inventory@demo.nexura.health",
    department: "Central Store",
  },
  {
    staffCode: "HR.FATIMA",
    name: "Fatima Sheikh",
    role: "hr",
    email: "hr@demo.nexura.health",
    department: "People Ops",
  },
  {
    staffCode: "AUD.VIKAS",
    name: "Vikas Bhardwaj",
    role: "auditor",
    email: "auditor@demo.nexura.health",
    department: "Quality & Compliance",
  },
  {
    staffCode: "CC.ROSHNI",
    name: "Roshni Fernandes",
    role: "coordinator",
    email: "coordinator@demo.nexura.health",
    department: "Care Coordination",
  },
];

const EMAIL_MAP: Record<string, string> = {
  "ADM.SUNIL": "admin@demo.nexura.health",
  "DR.RAJESH": "doctor@demo.nexura.health",
  "NS.PRIYA": "nurse@demo.nexura.health",
  "RX.KAVITA": "pharmacy@demo.nexura.health",
  "LAB.SURESH": "lab@demo.nexura.health",
  "CEO.NEHA": "executive@demo.nexura.health",
  "CMD.ANITA": "command@demo.nexura.health",
  "FAC.RAKESH": "facilities@demo.nexura.health",
  "REC.FARAH": "frontdesk@demo.nexura.health",
};

async function main() {
  const hospital = await db.hospital.findFirst();
  if (!hospital)
    throw new Error("Run the base seed first (scripts/seed-hospital.ts) — no hospital found.");
  const hospitalId = hospital.id;
  const pwHash = await bcrypt.hash(DEMO_PW, 12);
  const pinHash = await bcrypt.hash("2468", 12);
  console.log(`seeding v4 into ${hospital.name} (${hospitalId})`);

  /* ---------- organization ---------- */
  const org = await db.nxOrganization.upsert({
    where: { slug: "aarogya-group" },
    update: {},
    create: { name: "Aarogya Health Group", slug: "aarogya-group" },
  });
  await db.hospital.update({ where: { id: hospitalId }, data: { organizationId: org.id } });

  /* ---------- departments ---------- */
  const depts = [
    { name: "Internal Medicine", code: "IM", floor: "2" },
    { name: "Emergency Medicine", code: "EM", floor: "G" },
    { name: "ICU", code: "ICU", floor: "3" },
    { name: "Laboratory", code: "LAB", floor: "B1" },
    { name: "Pharmacy", code: "PH", floor: "G" },
    { name: "Radiology", code: "RAD", floor: "1" },
    { name: "Revenue Cycle", code: "FIN", floor: "4" },
    { name: "Front Desk", code: "OPD", floor: "G" },
  ];
  const deptIds: Record<string, string> = {};
  for (const d of depts) {
    const row = await db.nxDepartment.upsert({
      where: { hospitalId_code: { hospitalId, code: d.code } },
      update: { name: d.name, floor: d.floor },
      create: { hospitalId, ...d },
    });
    deptIds[d.code] = row.id;
  }

  /* ---------- v4 accounts ---------- */
  for (const a of NEW_ACCOUNTS) {
    await db.nxStaffUser.upsert({
      where: { staffCode: a.staffCode },
      update: { email: a.email, passwordHash: pwHash, departmentId: null },
      create: {
        hospitalId,
        staffCode: a.staffCode,
        name: a.name,
        role: a.role,
        email: a.email,
        department: a.department,
        speciality: a.speciality ?? null,
        passwordHash: pwHash,
        pinHash,
      },
    });
  }
  for (const [code, email] of Object.entries(EMAIL_MAP)) {
    await db.nxStaffUser.updateMany({
      where: { staffCode: code },
      data: { email, passwordHash: pwHash },
    });
  }

  /* ---------- patient demo account (scoped to own record) ---------- */
  const somePatient = await db.hospitalPatient.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true },
  });
  if (somePatient) {
    await db.nxStaffUser.upsert({
      where: { staffCode: "PAT.ARBOR" },
      update: {
        email: "patient@demo.nexura.health",
        passwordHash: pwHash,
        linkedPatientId: somePatient.id,
      },
      create: {
        hospitalId,
        staffCode: "PAT.ARBOR",
        name: `${somePatient.fullName} (Patient)`,
        role: "patient",
        email: "patient@demo.nexura.health",
        department: "Patient Access",
        passwordHash: pwHash,
        pinHash,
        linkedPatientId: somePatient.id,
      },
    });
    console.log(`patient demo linked to ${somePatient.fullName}`);
  }

  /* ---------- feature flags + system status ---------- */
  const flags = [
    { key: "os.realtime", enabled: true, description: "Live SSE stream in the Hospital OS shell" },
    { key: "os.breakglass", enabled: true, description: "Break-glass emergency access flow" },
    { key: "os.ai.assistant", enabled: true, description: "Governed AI assistant surface" },
    { key: "billing.v2", enabled: true, description: "Charges/payments v2 APIs" },
    { key: "os.mobile.sheets", enabled: true, description: "Mobile sheet windows" },
  ];
  for (const f of flags) {
    await db.nxFeatureFlag.upsert({
      where: { key: f.key },
      update: { enabled: f.enabled },
      create: { ...f },
    });
  }
  await db.nxSystemStatus.upsert({
    where: { key: "maintenance_mode" },
    update: {},
    create: {
      key: "maintenance_mode",
      enabled: false,
      severity: "warning",
      message: "Scheduled maintenance window — data entry may be delayed.",
    },
  });
  await db.nxSystemStatus.upsert({
    where: { key: "incident_banner" },
    update: {},
    create: {
      key: "incident_banner",
      enabled: false,
      severity: "critical",
      message: "Lab interface degraded — results may be delayed.",
    },
  });

  /* ---------- notifications ---------- */
  const existingNotifs = await db.nxNotification.count({ where: { hospitalId } });
  if (existingNotifs === 0) {
    await db.nxNotification.createMany({
      data: [
        {
          hospitalId,
          roleKey: "command",
          title: "Occupancy at 68% — 16 beds free",
          body: "General Ward A has the most availability right now.",
          level: "info",
          category: "bed",
        },
        {
          hospitalId,
          roleKey: "doctor",
          title: "3 results awaiting your validation",
          body: "Two are marked abnormal. Review when convenient.",
          level: "warning",
          category: "lab",
        },
        {
          hospitalId,
          roleKey: "nurse",
          title: "Vitals due on 4 patients",
          body: "ICU rounds in 20 minutes.",
          level: "info",
          category: "task",
        },
        {
          hospitalId,
          roleKey: "billing_officer",
          title: "2 claims need pre-auth follow-up",
          body: "Medi-Assist queries pending since Monday.",
          level: "warning",
          category: "billing",
        },
        {
          hospitalId,
          roleKey: "inventory_manager",
          title: "Low stock: N95 respirators",
          body: "Below reorder level in Central Store.",
          level: "warning",
          category: "inventory",
        },
      ],
    });
  }

  /* ---------- consents (for first patients) ---------- */
  const patients = await db.hospitalPatient.findMany({
    take: 6,
    orderBy: { createdAt: "asc" },
    select: { id: true, uhid: true },
  });
  const consentCount = await db.nxConsent.count({ where: { hospitalId } });
  if (consentCount === 0 && patients.length) {
    const types = ["treatment", "data_share", "telemedicine"];
    await db.nxConsent.createMany({
      data: patients.flatMap((p, i) => [
        {
          hospitalId,
          patientId: p.id,
          patientUhid: p.uhid,
          type: types[i % types.length],
          status: "granted",
          recordedBy: "ADM.SUNIL",
          note: "Signed at registration (demo)",
        },
        ...(i % 2 === 0
          ? [
              {
                hospitalId,
                patientId: p.id,
                patientUhid: p.uhid,
                type: "research",
                status: "denied",
                recordedBy: "ADM.SUNIL",
                note: "Patient opted out (demo)",
              },
            ]
          : []),
      ]),
    });
  }

  /* ---------- MAR entries ---------- */
  const marCount = await db.nxMedicationAdministration.count({ where: { hospitalId } });
  if (marCount === 0 && patients.length) {
    const now = Date.now();
    await db.nxMedicationAdministration.createMany({
      data: patients.slice(0, 4).flatMap((p, i) => [
        {
          hospitalId,
          patientId: p.id,
          patientUhid: p.uhid,
          medicineName: "Paracetamol 650mg",
          dose: "650 mg",
          route: "oral",
          scheduledAt: new Date(now - (i + 1) * 3600_000),
          status: "given",
          administeredBy: "Nurse Priya Singh",
          administeredAt: new Date(now - (i + 1) * 3600_000 + 5 * 60000),
        },
        {
          hospitalId,
          patientId: p.id,
          patientUhid: p.uhid,
          medicineName: "Piperacillin-Tazobactam 4.5g",
          dose: "4.5 g",
          route: "IV",
          scheduledAt: new Date(now + 45 * 60000),
          status: "pending",
          controlled: false,
        },
        ...(i === 0
          ? [
              {
                hospitalId,
                patientId: p.id,
                patientUhid: p.uhid,
                medicineName: "Morphine 2mg",
                dose: "2 mg",
                route: "IV",
                scheduledAt: new Date(now + 2 * 3600_000),
                status: "pending",
                controlled: true,
              },
            ]
          : []),
      ]),
    });
  }

  /* ---------- charges + payments ---------- */
  const chargeCount = await db.nxCharge.count({ where: { hospitalId } });
  if (chargeCount === 0 && patients.length) {
    await db.nxCharge.createMany({
      data: patients.slice(0, 5).flatMap((p, i) => [
        {
          hospitalId,
          patientId: p.id,
          patientUhid: p.uhid,
          description: "General ward bed charges (day)",
          quantity: 1,
          unitPrice: 350000,
          category: "room",
          createdBy: "BILL.ARVIND",
          status: i % 2 ? "invoiced" : "pending",
        },
        {
          hospitalId,
          patientId: p.id,
          patientUhid: p.uhid,
          description: "CBC + CRP panel",
          quantity: 1,
          unitPrice: 85000,
          category: "lab",
          createdBy: "BILL.ARVIND",
          status: "pending",
        },
        {
          hospitalId,
          patientId: p.id,
          patientUhid: p.uhid,
          description: "Physician consultation",
          quantity: 1,
          unitPrice: 150000,
          category: "consultation",
          createdBy: "BILL.ARVIND",
          status: "invoiced",
        },
      ]),
    });
    const firstPatient = patients[0];
    await db.nxPayment.create({
      data: {
        hospitalId,
        patientId: firstPatient.id,
        patientUhid: firstPatient.uhid,
        amount: 500000,
        mode: "upi",
        reference: "UPI-DEMO-001",
        receivedBy: "BILL.ARVIND",
        note: "Advance deposit (demo)",
      },
    });
  }

  /* ---------- vendor + PO ---------- */
  const vendorCount = await db.nxVendor.count({ where: { hospitalId } });
  if (vendorCount === 0) {
    const v1 = await db.nxVendor.create({
      data: {
        hospitalId,
        name: "MedSupply India Pvt Ltd",
        contactName: "Ramesh K",
        phone: "+91 98450 11223",
        email: "orders@medsupply.example",
        gstin: "29ABCDE1234F1Z5",
        rating: 4.5,
      },
    });
    await db.nxVendor.create({
      data: {
        hospitalId,
        name: "PharmaDist Wholesale",
        contactName: "Sneha P",
        phone: "+91 98450 44556",
        email: "sales@pharmadist.example",
        gstin: "29FGHIJ5678K1Z2",
        rating: 4.2,
      },
    });
    await db.nxPurchaseOrder.create({
      data: {
        hospitalId,
        vendorId: v1.id,
        vendorName: v1.name,
        poNumber: "PO-DEMO-0001",
        status: "submitted",
        items: JSON.stringify([
          { name: "N95 Respirator (Box of 20)", qty: 40, unit: "boxes", unitPrice: 120000 },
          { name: "Surgical Gloves M (Box of 100)", qty: 100, unit: "boxes", unitPrice: 35000 },
        ]),
        totalValue: 8300000,
        raisedBy: "INV.GANESH",
        expectedAt: new Date(Date.now() + 3 * 24 * 3600_000),
        notes: "Weekly replenishment (demo)",
      },
    });
  }

  /* ---------- credentials + shifts ---------- */
  const credCount = await db.nxCredential.count({ where: { user: { hospitalId } } });
  if (credCount === 0) {
    const doctor = await db.nxStaffUser.findUnique({ where: { staffCode: "DR.RAJESH" } });
    const nurse = await db.nxStaffUser.findUnique({ where: { staffCode: "NS.PRIYA" } });
    if (doctor) {
      await db.nxCredential.create({
        data: {
          staffUserId: doctor.id,
          kind: "license",
          name: "Medical Council Registration",
          issuedBy: "State Medical Council",
          issuedAt: new Date("2015-06-01"),
          expiresAt: new Date(Date.now() + 25 * 24 * 3600_000),
          verified: true,
        },
      });
    }
    if (nurse) {
      await db.nxCredential.create({
        data: {
          staffUserId: nurse.id,
          kind: "certification",
          name: "BLS Certification",
          issuedBy: "Indian Resuscitation Council",
          issuedAt: new Date("2024-03-01"),
          expiresAt: new Date(Date.now() + 20 * 24 * 3600_000),
          verified: true,
        },
      });
    }
  }
  const shiftCount = await db.nxShiftAssignment.count({ where: { hospitalId } });
  if (shiftCount === 0) {
    const staff = await db.nxStaffUser.findMany({
      where: { hospitalId, role: { in: ["doctor", "nurse"] } },
      take: 6,
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await db.nxShiftAssignment.createMany({
      data: staff.map((s, i) => ({
        staffUserId: s.id,
        hospitalId,
        date: today,
        shift: ["morning", "evening", "night"][i % 3],
        onCall: i === 0,
      })),
    });
  }

  /* ---------- waitlist ---------- */
  const waitCount = await db.nxAppointmentWaitlist.count({ where: { hospitalId } });
  if (waitCount === 0 && patients.length > 2) {
    await db.nxAppointmentWaitlist.createMany({
      data: [
        {
          hospitalId,
          patientId: patients[1].id,
          patientName: "Lakshmi Iyer",
          priority: "urgent",
          reason: "Earlier cardiology slot requested",
        },
        {
          hospitalId,
          patientId: patients[2].id,
          patientName: "Ramesh Patel",
          priority: "routine",
          reason: "Follow-up reschedule",
        },
      ],
    });
  }

  /* ---------- system channels ---------- */
  const chanCount = await db.nxChannel.count({ where: { hospitalId } });
  if (chanCount === 0) {
    const shift = await db.nxChannel.create({
      data: {
        hospitalId,
        key: "shift-handover",
        kind: "shift",
        name: "Shift Handover",
        createdBy: "CMD.ANITA",
        memberRoles: JSON.stringify(["doctor", "nurse", "command", "admin"]),
      },
    });
    await db.nxChannel.create({
      data: {
        hospitalId,
        key: "emergency",
        kind: "emergency",
        name: "Emergency",
        createdBy: "CMD.ANITA",
        memberRoles: JSON.stringify(["doctor", "nurse", "command", "admin"]),
      },
    });
    await db.nxChannelMember.create({
      data: {
        channelId: shift.id,
        userId: (await db.nxStaffUser.findUnique({ where: { staffCode: "CMD.ANITA" } }))!.id,
        memberName: "Anita Desai",
        memberRole: "command",
      },
    });
  }

  /* ---------- note versions backfill ---------- */
  const notesNoVersions = await db.clinicalNote.findMany({
    where: { versions: { none: {} } },
    take: 20,
  });
  for (const n of notesNoVersions) {
    await db.nxNoteVersion.create({
      data: {
        noteId: n.id,
        version: 1,
        changeKind: n.locked ? "sign" : "create",
        authorName: n.signedByName ?? "Dr. Rajesh Sharma",
        authorRole: "doctor",
        signedAt: n.signedAt,
        snapshot: JSON.stringify({
          subjective: n.subjective,
          objective: n.objective,
          assessment: n.assessment,
          plan: n.plan,
          fullText: n.fullText,
          noteType: n.noteType,
        }),
      },
    });
  }

  const summary = {
    staff: await db.nxStaffUser.count({ where: { hospitalId } }),
    departments: await db.nxDepartment.count({ where: { hospitalId } }),
    notifications: await db.nxNotification.count({ where: { hospitalId } }),
    consents: await db.nxConsent.count({ where: { hospitalId } }),
    mar: await db.nxMedicationAdministration.count({ where: { hospitalId } }),
    charges: await db.nxCharge.count({ where: { hospitalId } }),
    vendors: await db.nxVendor.count({ where: { hospitalId } }),
  };
  console.log("seed v4 complete:", JSON.stringify(summary));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
