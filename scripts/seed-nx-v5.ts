/* ============================================================
   NEXURA OS v5 SEED — governance, interop & flagship demo data
   Tenant + API key, ABAC policies, escalation policies, clinical
   pathways + an active run, AI thresholds, webhook endpoint,
   DICOM studies, genomic profile, wearables, settlement contract,
   teleconsults, simulations, VC identity, HaaS templates, plugins.
   Idempotent: safe to re-run (upserts by unique keys).
   Run: bun scripts/seed-nx-v5.ts
   ============================================================ */
import { PrismaClient } from "@prisma/client";
import { createHash, createHmac } from "crypto";

const db = new PrismaClient();
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

async function main() {
  const hospital = await db.hospital.findFirst({ orderBy: { createdAt: "asc" } });
  if (!hospital) throw new Error("Run seed:hospital first");
  const hid = hospital.id;
  const patients = await db.hospitalPatient.findMany({ where: { hospitalId: hid }, take: 8, orderBy: { createdAt: "asc" } });
  console.log(`seeding v5 governance layer into ${hospital.name} (${hid})`);

  /* ---------- Tenant + partner API key ---------- */
  const tenant = await db.nxTenant.upsert({
    where: { code: "aarogya-group" },
    create: {
      code: "aarogya-group", name: "Aarogya Health Group", plan: "premium", status: "active",
      brandingJson: JSON.stringify({ primary: "amber", logoText: "Aarogya", locale: "en", defaultTheme: "dark" }),
      modulesJson: null,
      domainsJson: JSON.stringify(["aarogya.nexura.health"]),
      settingsJson: JSON.stringify({ offlineMode: true, retentionProfile: "default", aiThresholds: true }),
    },
    update: { status: "active" },
  });
  await db.hospital.update({ where: { id: hid }, data: { tenantId: tenant.id } });

  const demoKeySecret = "nxk_live_demo0000000000000000000000000000";
  await db.nxApiKey.upsert({
    where: { keyHash: sha(demoKeySecret) },
    create: {
      tenantId: tenant.id, name: "LIS partner — Metropolis sandbox", prefix: demoKeySecret.slice(0, 12),
      keyHash: sha(demoKeySecret), scopes: JSON.stringify(["patients.read", "observations.read"]), rateLimitPerMin: 120,
    },
    update: { revokedAt: null },
  });

  /* ---------- ABAC policies ---------- */
  const abacExists = await db.nxAbacPolicy.count({ where: { hospitalId: hid } });
  if (abacExists === 0) {
    await db.nxAbacPolicy.createMany({
      data: [
        { hospitalId: hid, role: "nurse", effect: "allow", action: "read", resource: "patients", patientScope: "ward", note: "Nurses see patients in their current ward only" },
        { hospitalId: hid, role: "nurse", effect: "allow", action: "write", resource: "medications", patientScope: "assigned", timeWindows: JSON.stringify([{ days: [1, 2, 3, 4, 5, 6, 7], from: "06:00", to: "22:00" }]), note: "Medication administration only for assigned patients during shift window" },
        { hospitalId: hid, role: "billing_officer", effect: "deny", action: "*", resource: "patients", patientScope: "any", timeWindows: JSON.stringify([{ days: [1, 2, 3, 4, 5], from: "00:00", to: "05:00" }]), note: "No patient data access for billing at night — least privilege" },
        { hospitalId: hid, role: "nurse", effect: "allow", action: "read", resource: "patients", patientScope: "any", timeWindows: JSON.stringify([{ days: [1, 2, 3, 4, 5, 6, 7], from: "20:00", to: "07:30" }]), note: "Night shift: ward-wide visibility for safety (handover window)" },
      ],
    });
  }

  /* ---------- Escalation policies ---------- */
  const escTypes = [
    { alertType: "result.critical", levels: [{ afterMin: 0, notifyRoles: ["nurse", "doctor"] }, { afterMin: 10, notifyRoles: ["command", "dept_admin"] }, { afterMin: 30, notifyRoles: ["leadership", "hospital_admin"] }] },
    { alertType: "discharge.confirmed", levels: [{ afterMin: 0, notifyRoles: ["nurse", "receptionist"] }, { afterMin: 45, notifyRoles: ["command"] }] },
    { alertType: "incident.critical", levels: [{ afterMin: 0, notifyRoles: ["command"] }, { afterMin: 15, notifyRoles: ["hospital_admin", "leadership"] }] },
  ];
  for (const p of escTypes) {
    const exists = await db.nxEscalationPolicy.findFirst({ where: { hospitalId: hid, alertType: p.alertType } });
    if (!exists) await db.nxEscalationPolicy.create({ data: { hospitalId: hid, alertType: p.alertType, levelsJson: JSON.stringify(p.levels) } });
  }

  /* ---------- Clinical pathways ---------- */
  const pathways = [
    {
      code: "sepsis-bundle", name: "Sepsis 1-hour bundle", specialty: "critical-care",
      steps: [
        { id: "lactate", title: "Draw lactate + blood cultures", withinMin: 60, critical: true, ownerRole: "nurse" },
        { id: "antibiotics", title: "Broad-spectrum antibiotics administered", withinMin: 60, critical: true, requires: ["lactate"], ownerRole: "nurse" },
        { id: "fluids", title: "30ml/kg crystalloid bolus", withinMin: 180, critical: true, requires: ["lactate"], ownerRole: "nurse" },
        { id: "reassess", title: "Reassess perfusion (BP/urine/lactate)", withinMin: 240, requires: ["fluids"], ownerRole: "doctor", detail: "Escalate to ICU if MAP < 65" },
      ],
    },
    {
      code: "discharge-hf", name: "Heart failure discharge pathway", specialty: "cardiology",
      steps: [
        { id: "vitals_stable", title: "24h stable vitals confirmed", withinMin: 1440, critical: true, ownerRole: "nurse" },
        { id: "med_rec", title: "Discharge medication reconciliation", withinMin: 2880, requires: ["vitals_stable"], ownerRole: "doctor" },
        { id: "education", title: "Fluid/diet/weighing education given", withinMin: 2880, requires: ["vitals_stable"], ownerRole: "nurse" },
        { id: "followup", title: "Follow-up OPD booked within 7 days", withinMin: 4320, requires: ["med_rec"], ownerRole: "receptionist" },
      ],
    },
    {
      code: "chest-pain", name: "Chest pain triage protocol", specialty: "emergency",
      steps: [
        { id: "ecg", title: "12-lead ECG within 10 minutes", withinMin: 10, critical: true, ownerRole: "nurse" },
        { id: "trop", title: "Troponin ordered & drawn", withinMin: 20, critical: true, requires: ["ecg"], ownerRole: "nurse" },
        { id: "review", title: "Doctor review of ECG + troponin", withinMin: 45, requires: ["trop"], ownerRole: "doctor" },
        { id: "decision", title: "Admit / rule-out decision documented", withinMin: 120, requires: ["review"], ownerRole: "doctor" },
      ],
    },
  ];
  let hfDefId = "";
  for (const p of pathways) {
    const def = await db.nxPathwayDef.upsert({
      where: { id: `${hid}-${p.code}` },
      create: { id: `${hid}-${p.code}`, hospitalId: hid, code: p.code, name: p.name, specialty: p.specialty, stepsJson: JSON.stringify(p.steps) },
      update: { stepsJson: JSON.stringify(p.steps), active: true },
    });
    if (p.code === "discharge-hf") hfDefId = def.id;
  }
  const runExists = await db.nxPathwayRun.count({ where: { hospitalId: hid } });
  if (runExists === 0 && hfDefId && patients[0]) {
    await db.nxPathwayRun.create({
      data: {
        hospitalId: hid, defId: hfDefId, patientId: patients[0].id, patientName: patients[0].fullName,
        currentStep: "vitals_stable", status: "active", startedBy: "seed",
        stateJson: JSON.stringify({ completed: [], skipped: [], evidence: {}, tasksCreated: [] }),
        startedAt: new Date(Date.now() - 20 * 3600_000),
      },
    });
  }

  /* ---------- AI thresholds ---------- */
  const thresholds = [
    { feature: "patient_summary", minConfidence: 0.7, requireReview: true },
    { feature: "handover", minConfidence: 0.65, requireReview: true },
    { feature: "discharge_draft", minConfidence: 0.75, requireReview: true },
    { feature: "ops_recommend", minConfidence: 0.6, requireReview: false },
  ];
  for (const t of thresholds) {
    await db.nxAiThreshold.upsert({
      where: { hospitalId_feature: { hospitalId: hid, feature: t.feature } },
      create: { hospitalId: hid, ...t },
      update: { minConfidence: t.minConfidence },
    });
  }

  /* ---------- Webhook endpoint (demo sink) ---------- */
  const whExists = await db.nxWebhookEndpoint.count({ where: { hospitalId: hid } });
  if (whExists === 0) {
    await db.nxWebhookEndpoint.create({
      data: {
        hospitalId: hid, name: "Metropolis LIS gateway", url: "https://hooks.metropolis-sandbox.example/nexura",
        secret: `whsec_${sha(hid).slice(0, 24)}`, events: JSON.stringify(["result.critical", "discharge.confirmed"]), active: false,
      },
    });
  }

  /* ---------- DICOM studies ---------- */
  const dicomExists = await db.nxDicomStudy.count({ where: { hospitalId: hid } });
  if (dicomExists === 0 && patients[0] && patients[1]) {
    await db.nxDicomStudy.createMany({
      data: [
        { hospitalId: hid, patientId: patients[0].id, accession: "ACC-2026-0417", studyUid: "1.2.410.200010.2026.9.1.1123", modality: "CXR", bodyPart: "CHEST", seriesCount: 2, status: "reported", reportedBy: "Dr. Meera Iyer" },
        { hospitalId: hid, patientId: patients[1].id, accession: "ACC-2026-0418", studyUid: "1.2.410.200010.2026.9.1.1124", modality: "CT", bodyPart: "ABDOMEN", seriesCount: 48, status: "reporting" },
      ],
    });
  }

  /* ---------- Genomic profile (vault-ref only) ---------- */
  const genExists = await db.nxGenomicProfile.count({ where: { hospitalId: hid } });
  if (genExists === 0 && patients[2]) {
    await db.nxGenomicProfile.create({
      data: {
        hospitalId: hid, patientId: patients[2].id, vaultRef: `vault://genomics/${sha(patients[2].id).slice(0, 16)}`,
        variantsJson: JSON.stringify([
          { gene: "CYP2C19", variant: "*2", zygosity: "heterozygous", classpath: "pharmacogenomics" },
          { gene: "HBB", variant: "IVS1-5(G>C)", zygosity: "heterozygous", classpath: "carrier" },
          { gene: "BRCA1", variant: "none reported", zygosity: "-", classpath: "negative" },
        ]),
        riskJson: JSON.stringify({ cardio: 0.18, diabetes: 0.31, thalassemiaCarrier: 0.5 }),
      },
    });
  }

  /* ---------- Wearables ---------- */
  const wearExists = await db.nxWearableDevice.count({ where: { hospitalId: hid } });
  if (wearExists === 0 && patients[3]) {
    const dev = await db.nxWearableDevice.create({
      data: { hospitalId: hid, patientId: patients[3].id, source: "apple_health", model: "Watch Series 10" },
    });
    const now = Date.now();
    await db.nxWearableSample.createMany({
      data: [
        { deviceId: dev.id, metric: "resting_hr", value: 88, unit: "bpm", capturedAt: new Date(now - 2 * 3600_000) },
        { deviceId: dev.id, metric: "hrv", value: 28, unit: "ms", capturedAt: new Date(now - 3 * 3600_000) },
        { deviceId: dev.id, metric: "spo2", value: 94, unit: "%", capturedAt: new Date(now - 4 * 3600_000) },
        { deviceId: dev.id, metric: "sleep_minutes", value: 302, unit: "min", capturedAt: new Date(now - 12 * 3600_000) },
      ],
    });
  }

  /* ---------- Insurance settlement contract ---------- */
  const contractExists = await db.nxInsuranceContract.count({ where: { hospitalId: hid } });
  if (contractExists === 0 && patients[4]) {
    await db.nxInsuranceContract.create({
      data: {
        hospitalId: hid, patientId: patients[4].id, patientName: patients[4].fullName,
        insurer: "Star Health", policyNo: "SH-2026-77123",
        milestonesJson: JSON.stringify([
          { id: "admission", title: "Admission registered", amount: 20000, condition: "admission.created", met: true, metAt: new Date(Date.now() - 3 * 86400_000) },
          { id: "surgery", title: "Surgery completed", amount: 90000, condition: "ot.completed", met: false, metAt: null },
          { id: "discharge", title: "Discharge summary signed", amount: 40000, condition: "discharge.confirmed", met: false, metAt: null },
        ]),
        state: "active", payoutTotal: 150000, settledAmount: 20000,
        historyJson: JSON.stringify([{ at: new Date(Date.now() - 3 * 86400_000), state: "active", actor: "seed", note: "Contract activated on admission" }]),
      },
    });
  }

  /* ---------- Teleconsult ---------- */
  const teleExists = await db.nxTeleConsult.count({ where: { hospitalId: hid } });
  if (teleExists === 0 && patients[5]) {
    const staff = await db.nxStaffUser.findFirst({ where: { hospitalId: hid, role: "doctor" } });
    await db.nxTeleConsult.create({
      data: {
        hospitalId: hid, patientId: patients[5].id, patientName: patients[5].fullName,
        doctorId: staff?.id, doctorName: staff?.name, state: "requested", bandwidthMode: "auto",
        routedReason: "awaiting routing",
      },
    });
  }

  /* ---------- Simulation scenarios ---------- */
  const simDefaults = [
    {
      code: "anaphylaxis-ward", title: "Ward anaphylaxis: first 10 minutes", audience: "clinician", difficulty: "intermediate",
      tree: {
        id: "start", question: "A post-op patient develops urticaria and stridor. What first?",
        options: [
          { label: "Call for help + IM adrenaline 0.5mg", correct: true, next: { id: "q2", question: "Second action?", options: [{ label: "IV fluids + airway monitoring", correct: true }, { label: "Oral antihistamine only", correct: false }] } },
          { label: "IV hydrocortisone first", correct: false, next: null },
          { label: "Antihistamine and observe", correct: false, next: null },
        ],
      },
    },
    {
      code: "dengue-triage", title: "Dengue fever triage (OPD)", audience: "student", difficulty: "beginner",
      tree: {
        id: "start", question: "Fever 4 days, platelet 60k, tourniquet positive. Next step?",
        options: [
          { label: "Admit for IV fluids + daily CBC", correct: true, next: { id: "q2", question: "Warning signs to educate on?", options: [{ label: "Abdominal pain, bleeding, restlessness", correct: true }, { label: "Rash persistence", correct: false }] } },
          { label: "Home care with paracetamol only", correct: false, next: null },
        ],
      },
    },
  ];
  for (const s of simDefaults) {
    await db.nxSimulationScenario.upsert({
      where: { code: s.code },
      create: { code: s.code, title: s.title, audience: s.audience, difficulty: s.difficulty, treeJson: JSON.stringify(s.tree) },
      update: { treeJson: JSON.stringify(s.tree) },
    });
  }

  /* ---------- Verifiable credential for a patient ---------- */
  const vcExists = await db.nxVerifiableCredential.count({ where: { hospitalId: hid } });
  if (vcExists === 0 && patients[6]) {
    const claims = { id: `did:nexura:${patients[6].uhid.toLowerCase()}`, name: patients[6].fullName, uhid: patients[6].uhid, bloodGroup: patients[6].bloodGroup, allergies: patients[6].allergy };
    await db.nxVerifiableCredential.create({
      data: {
        hospitalId: hid, patientId: patients[6].id, type: "NexuraHealthID",
        claimsJson: JSON.stringify(claims), issuerId: `did:nexura:hospital:${hid}`,
        signature: createHmac("sha256", process.env.JWT_SECRET || "nexura-dev").update(JSON.stringify(claims)).digest("hex"),
        holderHint: patients[6].phone?.slice(-4),
      },
    });
  }

  /* ---------- HaaS templates ---------- */
  const templates = [
    { code: "ngo-rural", name: "NGO Rural Health Center", kind: "ngo-rural", config: { modules: ["patients", "tasks", "labs", "pharmacy", "schedule"], locales: ["hi", "mr"], offlineMode: true, settings: { retentionProfile: "strict" } } },
    { code: "tier2-nursing", name: "Tier-2 Nursing Home (30 beds)", kind: "nursing-home", config: { modules: ["patients", "tasks", "beds", "schedule", "pharmacy", "billing"], locales: ["hi", "gu", "ta"], offlineMode: true } },
    { code: "single-clinic", name: "Single-doctor Clinic", kind: "clinic", config: { modules: ["patients", "schedule"], locales: ["en"], offlineMode: false } },
    { code: "multi-specialty", name: "200-bed Multi-specialty", kind: "multispecialty", config: { modules: ["command-center", "patients", "doctor", "nurse", "tasks", "beds", "ed", "or", "labs", "pharmacy", "orders", "billing", "analytics", "automations"], locales: ["en", "hi", "ta", "te"], offlineMode: false } },
  ];
  for (const t of templates) {
    await db.nxHospitalTemplate.upsert({
      where: { code: t.code },
      create: { code: t.code, name: t.name, kind: t.kind, configJson: JSON.stringify(t.config) },
      update: { configJson: JSON.stringify(t.config) },
    });
  }

  /* ---------- Plugins ---------- */
  const plugins = [
    { code: "glucometer-bridge", name: "Ward Glucometer Bridge", version: "1.0.0", vendor: "Nexura Labs", permissions: ["patients.read", "labs.result.enter"], entry: { kind: "panel", route: "plugins/glucometer", slots: ["patient_record"] } },
    { code: "northstar-triage", name: "NorthStar Pediatric Triage", version: "0.9.2", vendor: "NorthStar Health", permissions: ["patients.read"], entry: { kind: "panel", route: "plugins/northstar", slots: ["ed_board"] } },
  ];
  for (const p of plugins) {
    await db.nxPlugin.upsert({
      where: { code: p.code },
      create: { code: p.code, name: p.name, version: p.version, vendor: p.vendor, permissionsJson: JSON.stringify(p.permissions), entryJson: JSON.stringify(p.entry), enabled: p.code === "glucometer-bridge" },
      update: {},
    });
  }

  const counts = {
    tenants: await db.nxTenant.count(), apiKeys: await db.nxApiKey.count(),
    abac: await db.nxAbacPolicy.count(), escalations: await db.nxEscalationPolicy.count(),
    pathwayDefs: await db.nxPathwayDef.count(), pathwayRuns: await db.nxPathwayRun.count(),
    aiThresholds: await db.nxAiThreshold.count(), dicom: await db.nxDicomStudy.count(),
    genomics: await db.nxGenomicProfile.count(), wearables: await db.nxWearableDevice.count(),
    contracts: await db.nxInsuranceContract.count(), sims: await db.nxSimulationScenario.count(),
    vcs: await db.nxVerifiableCredential.count(), templates: await db.nxHospitalTemplate.count(),
    plugins: await db.nxPlugin.count(), teleconsults: await db.nxTeleConsult.count(),
  };
  console.log("seed v5 complete:", JSON.stringify(counts));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
