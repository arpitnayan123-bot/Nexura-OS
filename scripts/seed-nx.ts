import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/* Demo-seed guard: demo seeds write synthetic patients/staff with known
   passwords and demo API keys — they must never run against a production
   database by accident. Override requires an explicit, intentional flag. */
if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO_OVERRIDE !== "true") {
  console.error(
    "[seed] Refusing to seed demo data: NODE_ENV=production. If this is genuinely intentional, re-run with SEED_DEMO_OVERRIDE=true.",
  );
  process.exit(1);
}

/* ============================================================
   NEXURA OS — realistic demo seed (Phase 1 data)
   Extends existing hospital seed: staff logins, work queue,
   incidents, orders + lifecycle events, equipment, supplies,
   care-team messages, automation rules, past automation runs,
   and a hash-chained audit trail.
   ============================================================ */

const H = () => db.hospital.findFirst();

function hoursFromNow(h: number) {
  return new Date(Date.now() + h * 3600000);
}
function daysFromNow(d: number) {
  return new Date(Date.now() + d * 86400000);
}
function hash(prev: string | null, s: string) {
  return crypto
    .createHash("sha256")
    .update(`${prev || ""}|${s}`)
    .digest("hex");
}

async function main() {
  const hospital = await H();
  if (!hospital) {
    console.error("Run scripts/seed-hospital.ts first — no hospital found");
    process.exit(1);
  }
  const hospitalId = hospital.id;
  console.log("🚀 Seeding Nexura OS for:", hospital.name, "\n");

  // wipe previous nx seed (idempotent re-run)
  await db.nxWorkflowRun.deleteMany({ where: { hospitalId } });
  await db.nxAutomationRule.deleteMany({ where: { hospitalId } });
  await db.nxMessage.deleteMany({ where: { hospitalId } });
  await db.nxSupplyItem.deleteMany({ where: { hospitalId } });
  await db.nxEquipment.deleteMany({ where: { hospitalId } });
  await db.nxOrderEvent.deleteMany({ where: { hospitalId } });
  await db.nxAuditEvent.deleteMany({ where: { hospitalId } });
  await db.nxIncident.deleteMany({ where: { hospitalId } });
  await db.nxTask.deleteMany({ where: { hospitalId } });
  await db.nxStaffUser.deleteMany({ where: { hospitalId } });
  await db.nxAIInteraction.deleteMany({ where: { hospitalId } });

  const pinHash = await bcrypt.hash("2468", 10);

  // ---------- 1. Staff logins (one per role; PIN 2468 demo) ----------
  const staffData = [
    {
      staffCode: "DR.RAJESH",
      name: "Dr. Rajesh Sharma",
      role: "doctor",
      department: "Internal Medicine",
      speciality: "Internal Medicine",
      shift: "morning",
    },
    {
      staffCode: "DR.MEERA",
      name: "Dr. Meera Joshi",
      role: "doctor",
      department: "Gynecology",
      speciality: "Obstetrics & Gynecology",
      shift: "evening",
    },
    {
      staffCode: "DR.VIKRAM",
      name: "Dr. Vikram Rao",
      role: "doctor",
      department: "Emergency Medicine",
      speciality: "Emergency Medicine",
      shift: "night",
    },
    {
      staffCode: "NS.PRIYA",
      name: "Nurse Priya Singh",
      role: "nurse",
      department: "ICU",
      shift: "morning",
    },
    {
      staffCode: "NS.AMIT",
      name: "Nurse Amit Kumar",
      role: "nurse",
      department: "General Ward",
      shift: "evening",
    },
    {
      staffCode: "CMD.ANITA",
      name: "Anita Desai",
      role: "command",
      department: "Command Center",
      shift: "morning",
    },
    {
      staffCode: "LAB.SURESH",
      name: "Suresh Patel",
      role: "lab",
      department: "Laboratory",
      shift: "morning",
    },
    {
      staffCode: "RX.KAVITA",
      name: "Kavita Verma",
      role: "pharmacist",
      department: "Pharmacy",
      shift: "morning",
    },
    {
      staffCode: "FAC.RAKESH",
      name: "Rakesh Yadav",
      role: "facilities",
      department: "Facilities & EVS",
      shift: "morning",
    },
    {
      staffCode: "REC.FARAH",
      name: "Farah Khan",
      role: "reception",
      department: "Front Desk",
      shift: "morning",
    },
    {
      staffCode: "ADM.SUNIL",
      name: "Sunil Menon",
      role: "admin",
      department: "Administration",
      shift: "morning",
    },
    {
      staffCode: "CEO.NEHA",
      name: "Neha Kulkarni",
      role: "leadership",
      department: "Executive",
      shift: "morning",
    },
  ];
  const staff = [] as { id: string; name: string; role: string }[];
  for (const s of staffData) {
    const created = await db.nxStaffUser.create({
      data: { hospitalId, ...s, pinHash, onDuty: true },
    });
    staff.push({ id: created.id, name: created.name, role: created.role });
  }
  console.log(`✅ ${staff.length} staff logins (PIN 2468)`);

  // ---------- 2. Pull context from hospital seed ----------
  const patients = await db.hospitalPatient.findMany({
    where: { hospitalId },
    take: 12,
    orderBy: { createdAt: "asc" },
  });
  const admissions = await db.hospitalAdmission.findMany({
    where: { hospitalId, dischargeStatus: "active" },
    include: { patient: true, bed: { include: { ward: true } } },
  });
  const doctors = await db.hospitalDoctor.findMany({ where: { hospitalId } });
  const wards = await db.hospitalWard.findMany({ where: { hospitalId }, include: { beds: true } });
  const P = (i: number) => patients[i % patients.length];
  const doc = (i: number) => doctors[i % Math.max(doctors.length, 1)];

  // ---------- 3. Work queue ----------
  const taskSeed = [
    {
      title: "Acknowledge critical potassium 6.8 mmol/L — Ramesh Patel",
      type: "result",
      priority: "critical",
      ownerRole: "doctor",
      ownerName: "Dr. Rajesh Sharma",
      patientIdx: 2,
      dueMin: 15,
      reason: "Critical lab value — 15-min acknowledgement SLA",
      sourceModule: "labs",
      status: "open",
    },
    {
      title: "ICU bedside handover — night shift",
      type: "handover",
      priority: "high",
      ownerRole: "nurse",
      ownerName: "Nurse Priya Singh",
      dueMin: 60,
      reason: "Shift change in 1 hour — structured SBAR handover",
      sourceModule: "nurse",
      status: "open",
    },
    {
      title: "Pharmacist verification — ceftriaxone 1g IV order (Suresh Nair)",
      type: "approval",
      priority: "high",
      ownerRole: "pharmacist",
      ownerName: "Kavita Verma",
      patientIdx: 0,
      dueMin: 30,
      reason: "New antibiotic order — interaction & renal dose check",
      sourceModule: "pharmacy",
      status: "open",
    },
    {
      title: "Clean & inspect bed ICU-07 after discharge",
      type: "cleaning",
      priority: "high",
      ownerRole: "facilities",
      ownerName: "Rakesh Yadav",
      dueMin: 45,
      reason: "Bed turnaround SLA 45 min",
      sourceModule: "automations",
      status: "in_progress",
    },
    {
      title: "Pre-op checklist: consent + fasting confirmation — Lakshmi Iyer (OT-2, 14:00)",
      type: "approval",
      priority: "high",
      ownerRole: "nurse",
      ownerName: "Nurse Amit Kumar",
      patientIdx: 1,
      dueMin: 120,
      reason: "Surgery at 14:00 — checklist due 2h before incision",
      sourceModule: "or",
      status: "open",
    },
    {
      title: "Discharge summary sign-off — Deepika K",
      type: "task",
      priority: "medium",
      ownerRole: "doctor",
      ownerName: "Dr. Meera Joshi",
      patientIdx: 3,
      dueMin: 240,
      reason: "Patient medically ready — pending summary approval",
      sourceModule: "doctor",
      status: "open",
    },
    {
      title: "Blood sample transport — Lab to Blood Bank (crossmatch)",
      type: "transport",
      priority: "urgent" as unknown as string,
      ownerRole: "nurse",
      ownerName: "Nurse Priya Singh",
      patientIdx: 4,
      dueMin: 20,
      reason: "Crossmatch before scheduled transfusion",
      sourceModule: "lab",
      status: "open",
    },
    {
      title: "Insurance pre-auth follow-up — Medi-Assist (Priya Sharma)",
      type: "followup",
      priority: "medium",
      ownerRole: "admin",
      ownerName: "Sunil Menon",
      patientIdx: 5,
      dueMin: 180,
      reason: "Pre-auth submitted 26h ago — TPA SLA 48h",
      sourceModule: "billing",
      status: "open",
    },
    {
      title: "MRI contrast allergy check — Mohan Das",
      type: "review",
      priority: "high",
      ownerRole: "doctor",
      ownerName: "Dr. Vikram Rao",
      patientIdx: 6,
      dueMin: 60,
      reason: "Documented penicillin allergy — contrast protocol review",
      sourceModule: "orders",
      status: "open",
    },
    {
      title: "Restock crash cart trolley — Emergency Bay 2",
      type: "task",
      priority: "high",
      ownerRole: "nurse",
      ownerName: "Nurse Amit Kumar",
      dueMin: 90,
      reason: "Daily safety check per NABH guideline",
      sourceModule: "ed",
      status: "open",
    },
    {
      title: "48-hour post-discharge call — Sanjay Verma",
      type: "followup",
      priority: "medium",
      ownerRole: "nurse",
      ownerName: "Nurse Priya Singh",
      patientIdx: 7,
      dueMin: 300,
      reason: "Early post-discharge contact detects deterioration",
      sourceModule: "automations",
      status: "done",
    },
    {
      title: "Ventilator V-102 preventive maintenance overdue",
      type: "task",
      priority: "critical",
      ownerRole: "facilities",
      ownerName: "Rakesh Yadav",
      dueMin: -30,
      reason: "Maintenance overdue 30 min — asset flagged out of service",
      sourceModule: "equipment",
      status: "blocked",
    },
  ];
  let doneCount = 0;
  for (const t of taskSeed) {
    const p = t.patientIdx !== undefined ? P(t.patientIdx) : null;
    const adm = admissions.find((a) => a.patientId === p?.id);
    await db.nxTask.create({
      data: {
        hospitalId,
        title: t.title,
        type: t.type,
        priority: t.priority === ("urgent" as unknown as string) ? "high" : t.priority,
        status: t.status,
        ownerRole: t.ownerRole,
        ownerName: t.ownerName,
        patientId: p?.id,
        patientName: p?.fullName,
        patientUhid: p?.uhid,
        location: adm?.bed ? `${adm.bed.ward?.name} · ${adm.bed.bedNumber}` : undefined,
        dueAt: t.dueMin !== undefined ? new Date(Date.now() + t.dueMin * 60000) : null,
        reason: t.reason,
        sourceModule: t.sourceModule,
        completedAt: t.status === "done" ? new Date() : null,
      },
    });
    if (t.status === "done") doneCount++;
  }
  console.log(`✅ ${taskSeed.length} work-queue tasks`);

  // ---------- 4. Incidents ----------
  const incidentSeed = [
    {
      severity: "critical",
      status: "acknowledged",
      category: "clinical",
      title: "Critical K+ 6.8 mmol/L — Ramesh Patel (Lab)",
      description: "Auto-escalated on result validation. Dr. Rajesh Sharma acknowledged at 09:41.",
      patientIdx: 2,
      location: "ICU",
    },
    {
      severity: "major",
      status: "investigating",
      category: "equipment",
      title: "Ventilator V-102 out of service — preventive maintenance overdue",
      description: "Swapped with reserve V-108. Biomedical notified; part expected today 16:00.",
      location: "ICU store",
    },
    {
      severity: "minor",
      status: "open",
      category: "operational",
      title: "OPD wait time trending above 35 min — Department of Internal Medicine",
      description: "Two doctors on leave. Load-balancing suggestion created for command center.",
      location: "OPD Level 1",
    },
    {
      severity: "minor",
      status: "resolved",
      category: "medication",
      title: "Near-miss: 10x dose flag on heparin infusion (caught at pharmacy verification)",
      description: "Order corrected before dispensing. Reporter and pharmacist debrief completed.",
      resolved: true,
    },
  ];
  for (const i of incidentSeed) {
    const p = i.patientIdx !== undefined ? P(i.patientIdx) : null;
    await db.nxIncident.create({
      data: {
        hospitalId,
        severity: i.severity,
        status: i.status,
        category: i.category,
        title: i.title,
        description: i.description,
        location: i.location,
        patientId: p?.id,
        reportedBy: i.title.includes("Lab") ? "Nexura Automation" : "Nurse Priya Singh",
        acknowledgedAt: i.status !== "open" ? new Date(Date.now() - 3600000) : null,
        resolvedAt: i.resolved ? new Date(Date.now() - 7200000) : null,
      },
    });
  }
  console.log(`✅ ${incidentSeed.length} incidents`);

  // ---------- 5. Orders with lifecycle events + lab results ----------
  const orderPlans = [
    {
      patientIdx: 2,
      type: "lab",
      test: "Serum Electrolytes (K+, Na+)",
      priority: "stat",
      status: "completed",
      doctorIdx: 2,
      results: [
        {
          testName: "Potassium (K+)",
          value: "6.8",
          unit: "mmol/L",
          refMin: 3.5,
          refMax: 5.1,
          flag: "critical",
        },
        {
          testName: "Sodium (Na+)",
          value: "136",
          unit: "mmol/L",
          refMin: 136,
          refMax: 145,
          flag: "normal",
        },
      ],
    },
    {
      patientIdx: 0,
      type: "lab",
      test: "CBC with differential",
      priority: "routine",
      status: "in_progress",
      doctorIdx: 0,
      results: [],
    },
    {
      patientIdx: 1,
      type: "imaging",
      test: "Chest X-Ray PA view",
      priority: "urgent",
      status: "acknowledged",
      doctorIdx: 1,
      results: [],
    },
    {
      patientIdx: 4,
      type: "lab",
      test: "HbA1c",
      priority: "routine",
      status: "completed",
      doctorIdx: 0,
      results: [
        { testName: "HbA1c", value: "8.9", unit: "%", refMin: 4.0, refMax: 5.6, flag: "high" },
      ],
    },
    {
      patientIdx: 6,
      type: "medication",
      test: "Ceftriaxone 1g IV BD × 3 days",
      priority: "urgent",
      status: "ordered",
      doctorIdx: 2,
      results: [],
    },
    {
      patientIdx: 3,
      type: "procedure",
      test: "Wound dressing — surgical site",
      priority: "routine",
      status: "completed",
      doctorIdx: 1,
      results: [],
    },
    {
      patientIdx: 5,
      type: "lab",
      test: "Troponin-I (STAT)",
      priority: "stat",
      status: "completed",
      doctorIdx: 2,
      results: [
        {
          testName: "Troponin-I",
          value: "0.9",
          unit: "ng/mL",
          refMin: 0,
          refMax: 0.04,
          flag: "critical",
        },
      ],
    },
  ];
  const createdOrderIds: string[] = [];
  for (const op of orderPlans) {
    const p = P(op.patientIdx);
    const d = doc(op.doctorIdx);
    const order = await db.hospitalOrder.create({
      data: {
        hospitalId,
        patientUhid: p.uhid,
        patientId: p.id,
        orderingDoctorId: d?.id,
        orderType: op.type,
        orderDetails: JSON.stringify({
          testName: op.test,
          notes: "Seeded by Nexura OS Phase-1 data",
        }),
        priority: op.priority,
        status: op.status,
      },
    });
    createdOrderIds.push(order.id);
    // lifecycle events
    const events: Array<[string | null, string, string, string]> = [
      [null, "ordered", d?.name || "Dr. Rajesh Sharma", "doctor"],
      ["ordered", "acknowledged", "Suresh Patel", "lab"],
      ["acknowledged", "in_progress", "Suresh Patel", "lab"],
      ["in_progress", "completed", "Dr. Rajesh Sharma", "doctor"],
    ];
    const upto =
      { ordered: 1, acknowledged: 2, in_progress: 3, completed: 4, cancelled: 1 }[op.status] || 1;
    let prev: string | null = null;
    for (let i = 0; i < upto; i++) {
      const [from, to, actorName, actorRole] = events[i];
      await db.nxOrderEvent.create({
        data: {
          hospitalId,
          orderId: order.id,
          fromStatus: prev,
          toStatus: to,
          actorName,
          actorRole,
          createdAt: new Date(Date.now() - (upto - i) * 1800000),
        },
      });
      prev = to;
    }
    for (const r of op.results) {
      await db.labResult.create({
        data: {
          orderId: order.id,
          testName: r.testName,
          resultValue: r.value,
          unit: r.unit,
          refRangeMin: r.refMin,
          refRangeMax: r.refMax,
          abnormalFlag: r.flag,
          reportedAt: new Date(Date.now() - 900000),
        },
      });
    }
  }
  console.log(`✅ ${orderPlans.length} orders with lifecycle events`);

  // ---------- 6. Equipment ----------
  const eq = [
    ["Ventilator V-102", "ventilator", "ICU Store", "fault", -45, 62],
    ["Ventilator V-108", "ventilator", "ICU Bay 3", "in_service", 20, 71],
    ["Infusion Pump IP-221", "infusion_pump", "General Ward A", "in_service", 12, 84],
    ["Infusion Pump IP-224", "infusion_pump", "ICU Bay 1", "maintenance", 5, 30],
    ["Multi-para Monitor MP-31", "monitor", "ICU Bay 2", "in_service", 30, 91],
    ["Defibrillator DF-05", "defibrillator", "Emergency Bay 1", "in_service", 8, 45],
    ["X-Ray Machine XR-01", "imaging", "Radiology", "in_service", 60, 88],
    ["Ultrasound US-12", "imaging", "Radiology", "in_service", 25, 76],
    ["Hematology Analyzer HA-02", "lab_instrument", "Laboratory", "in_service", 40, 93],
    ["Wheelchair WC-19", "wheelchair", "Lobby", "in_service", 90, 55],
  ] as const;
  for (const [name, category, location, status, nextDays, util] of eq) {
    await db.nxEquipment.create({
      data: {
        hospitalId,
        name,
        category,
        assetTag: `NX-${category.toUpperCase().slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`,
        location,
        department: location.split(" ")[0],
        status,
        lastCalibration: daysFromNow(-90),
        nextMaintenance: daysFromNow(nextDays),
        utilization: util,
      },
    });
  }
  console.log(`✅ ${eq.length} equipment assets`);

  // ---------- 7. Inventory / supplies ----------
  const supplies = [
    ["Normal Saline 500ml", "consumable", "bottles", 240, 80, "ALP-2291", 240],
    ["Nitrile Gloves (M)", "ppe", "boxes", 34, 40, "GLV-8842", 300],
    ["Surgical Mask N95", "ppe", "boxes", 58, 30, "MSK-1123", 400],
    ["Suture Kit 3-0 Vicryl", "surgical", "kits", 12, 15, "SUR-5521", 180],
    ["Heparin 5000 IU vial", "medication", "vials", 8, 20, "HEP-3301", 60],
    ["Blood Collection Tube (EDTA)", "lab", "tubes", 980, 300, "EDTA-0091", 210],
    ["SpO2 Probe Adult", "consumable", "units", 26, 10, "SPO-7712", 150],
    ["Contrast Media (Iohexol 350)", "medication", "vials", 15, 8, "IOH-4410", 45],
  ] as const;
  for (const [name, category, unit, onHand, reorder, batch, expiryDays] of supplies) {
    await db.nxSupplyItem.create({
      data: {
        hospitalId,
        name,
        category,
        unit,
        onHand,
        reorderLevel: reorder,
        batchNo: batch,
        expiryDate: daysFromNow(expiryDays),
        supplier: "MedSupply India Pvt Ltd",
      },
    });
  }
  console.log(`✅ ${supplies.length} supply items (2 flagged low stock)`);

  // ---------- 8. Care-team messages ----------
  const adm0 = admissions[0];
  const ch0 = `care-team:${createdOrderIds[0]}`;
  const msgs: Array<[string, string, string, string, string | undefined]> = [
    [
      ch0,
      "Dr. Rajesh Sharma",
      "doctor",
      "K+ 6.8 confirmed. Starting insulin-dextrose infusion + cardiac monitoring. Please hold ACE inhibitor.",
      P(2).id,
    ],
    [
      ch0,
      "Nurse Priya Singh",
      "nurse",
      "Infusion started 09:52. Cardiac monitor on — rhythm sinus so far. Will recheck K+ at 12:00.",
      P(2).id,
    ],
    [
      ch0,
      "Suresh Patel",
      "lab",
      "STAT recheck sample received 09:58 — processing now, result in ~20 min.",
      P(2).id,
    ],
    [
      "shift-handover",
      "Nurse Amit Kumar",
      "nurse",
      "Evening handover: Bed A-12 new admission, IV fluids q8h. Bed B-03 dressing due 20:00. No new allergies today.",
      undefined,
    ],
    [
      adm0 ? `care-team:${adm0.id}` : "dept-internal-medicine",
      "Dr. Meera Joshi",
      "doctor",
      "Plan for today: ambulate twice, switch to oral antibiotics if afebrile, review discharge readiness tomorrow.",
      adm0?.patientId,
    ],
  ];
  for (const [channelKey, senderName, senderRole, body, patientId] of msgs) {
    await db.nxMessage.create({
      data: { hospitalId, channelKey, senderName, senderRole, body, patientId },
    });
  }
  console.log(`✅ ${msgs.length} care-team messages`);

  // ---------- 9. Automation rules ----------
  const rules = [
    {
      name: "Critical result escalation",
      description:
        "When a laboratory result is validated as critical → acknowledge task (15-min SLA) + critical incident + care-team alert + escalation if unacknowledged.",
      triggerType: "result.critical",
      actions: [
        "Create critical acknowledgement task for attending doctor (15 min SLA)",
        "Open critical incident for Command Center",
        "Notify care-team channel",
        "Escalate to HOD if unacknowledged after 15 min",
      ],
      requiresApproval: false,
    },
    {
      name: "Discharge coordination cascade",
      description:
        "When a discharge is confirmed → bed lifecycle, cleaning task, pharmacy, billing, follow-up scheduling, patient & caregiver notification, 48-hour check-in.",
      triggerType: "discharge.confirmed",
      actions: [
        "Mark bed cleaning_required",
        "Create cleaning task (45-min SLA)",
        "Notify pharmacy for discharge meds",
        "Notify billing to finalize invoice",
        "Create follow-up scheduling task",
        "Create 48-hour check-in task",
        "Notify patient & approved caregiver",
      ],
      requiresApproval: false,
    },
    {
      name: "Bed-ready assignment nudge",
      description:
        "When a bed passes inspection → prompt bed management to assign the next suitable patient within 30 min.",
      triggerType: "bed.ready",
      actions: ["Create assignment task for bed management (30-min SLA)"],
      requiresApproval: false,
    },
    {
      name: "Order routing & SLA tasks",
      description:
        "When an order is created → route to lab/pharmacy/imaging worklist with priority-based SLA task.",
      triggerType: "order.created",
      actions: ["Route by order type", "Create priority-based collection/verification task"],
      requiresApproval: false,
    },
    {
      name: "Appointment prep & reminders",
      description:
        "When an appointment is booked → reminder + digital pre-registration forms in patient portal.",
      triggerType: "appointment.created",
      actions: ["Queue SMS + portal reminder", "Send digital forms"],
      requiresApproval: false,
    },
  ];
  const ruleRecords: Array<{ id: string; name: string; triggerType: string }> = [];
  for (const r of rules) {
    const created = await db.nxAutomationRule.create({
      data: {
        hospitalId,
        name: r.name,
        description: r.description,
        triggerType: r.triggerType,
        conditions: JSON.stringify({}),
        actions: JSON.stringify(r.actions),
        enabled: true,
        requiresApproval: r.requiresApproval,
        runCount: 12 + Math.floor(Math.random() * 40),
        lastRunAt: new Date(Date.now() - Math.random() * 8 * 3600000),
      },
    });
    ruleRecords.push({ id: created.id, name: created.name, triggerType: created.triggerType });
  }
  // A few historical runs for the builder UI
  const runSamples = [
    { ruleIdx: 0, patientIdx: 2, status: "completed", minsAgo: 75 },
    { ruleIdx: 1, patientIdx: 3, status: "completed", minsAgo: 220 },
    { ruleIdx: 2, patientIdx: undefined, status: "completed", minsAgo: 400 },
    { ruleIdx: 1, patientIdx: 5, status: "awaiting_approval", minsAgo: 30 },
  ];
  for (const rs of runSamples) {
    const rule = ruleRecords[rs.ruleIdx];
    const p = rs.patientIdx !== undefined ? P(rs.patientIdx) : null;
    await db.nxWorkflowRun.create({
      data: {
        hospitalId,
        ruleId: rule.id,
        ruleName: rule.name,
        patientId: p?.id,
        patientUhid: p?.uhid,
        status: rs.status,
        currentStep:
          rs.status === "awaiting_approval" ? "Notify billing to finalize invoice" : "Completed",
        steps: JSON.stringify([
          {
            name: "Trigger received",
            status: "done",
            detail: rule.triggerType,
            at: new Date(Date.now() - rs.minsAgo * 60000).toISOString(),
          },
          {
            name: "Actions executed",
            status: rs.status === "awaiting_approval" ? "awaiting_approval" : "done",
            detail: "All deterministic steps finished",
            at: new Date(Date.now() - rs.minsAgo * 60000 + 4000).toISOString(),
          },
        ]),
        startedAt: new Date(Date.now() - rs.minsAgo * 60000),
        completedAt: new Date(Date.now() - rs.minsAgo * 60000 + 5000),
      },
    });
  }
  console.log(`✅ ${rules.length} automation rules + ${runSamples.length} run history`);

  // ---------- 10. Audit trail (hash-chained) ----------
  let prevHash: string | null = null;
  const auditSeed: Array<
    [string, string, string, string, string | undefined, Record<string, unknown> | undefined]
  > = [
    ["ADM.SUNIL", "admin", "auth.login", "session", undefined, { method: "pin+role" }],
    [
      "DR.RAJESH",
      "doctor",
      "order.create",
      "HospitalOrder",
      createdOrderIds[0],
      { type: "lab", priority: "stat" },
    ],
    ["LAB.SURESH", "lab", "result.validate", "LabResult", createdOrderIds[0], { critical: true }],
    [
      "Nexura Automation",
      "system",
      "automation.result.critical",
      "automation_run",
      undefined,
      { rule: "Critical result escalation" },
    ],
    [
      "CMD.ANITA",
      "command",
      "incident.acknowledge",
      "NxIncident",
      undefined,
      { severity: "critical" },
    ],
    [
      "RX.KAVITA",
      "pharmacist",
      "prescription.verify",
      "HospitalPrescription",
      undefined,
      { interactionCheck: "passed" },
    ],
    [
      "FAC.RAKESH",
      "facilities",
      "bed.lifecycle",
      "HospitalBed",
      undefined,
      { from: "cleaning_in_progress", to: "inspection_required" },
    ],
    [
      "REC.FARAH",
      "reception",
      "patient.register",
      "HospitalPatient",
      undefined,
      { channel: "front_desk" },
    ],
  ];
  for (const [actorCode, role, action, entityType, entityId, detail] of auditSeed) {
    const actor =
      staff.find((s) =>
        s.name.startsWith(actorCode.split(".")[1] ? actorCode.split(".")[1] : ""),
      ) || staff[0];
    const at = new Date(Date.now() - Math.floor(Math.random() * 8 * 3600000));
    const h = hash(prevHash, `${actorCode}${action}${at.toISOString()}`);
    await db.nxAuditEvent.create({
      data: {
        hospitalId,
        actorName: actorCode,
        actorRole: role,
        action,
        entityType,
        entityId,
        detail: detail ? JSON.stringify(detail) : null,
        prevHash,
        hash: h,
        createdAt: at,
      },
    });
    prevHash = h;
  }
  console.log(`✅ ${auditSeed.length} hash-chained audit events`);

  console.log("\n🌟 Nexura OS seed complete. Staff PIN for all demo logins: 2468");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
