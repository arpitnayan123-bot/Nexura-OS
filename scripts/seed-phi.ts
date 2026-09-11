/* ============================================================
 * NEXURA PHI — SEED (non-clinical development fixtures)
 * Idempotent. Creates ONLY demo data: one demo subject with
 * default consent rows, plus versioned evidence-content items.
 * NO clinical claims: every content item is DEMO posture with
 * reviewer "PENDING (demo)" and status approved-for-demo only.
 * Run: bun scripts/seed-phi.ts
 * ============================================================ */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const DEMO_SUBJECT_LABEL = "demo-phi-subject";

const CONTENT_ITEMS = [
  {
    contentKey: "rec.data_completeness",
    category: "data_completeness",
    text: "Every optional detail you add — even partial — helps separate real patterns from noise. You can complete sections gradually and skip anything you prefer not to share.",
  },
  {
    contentKey: "rec.activity_start",
    category: "lifestyle",
    text: "Most adult guidelines suggest at least 150 minutes of moderate movement a week, but every 10 extra minutes still counts. In Indian summer, early morning or after sunset walks are easiest to keep regular. Stairs, walking to the bus stop, and household work all count.",
  },
  {
    contentKey: "rec.sleep_hygiene",
    category: "lifestyle",
    text: "A consistent sleep window — same bedtime and wake time, within about an hour — is the single most effective sleep habit. Dim lights and keep the last half hour screen-light. If you work night shifts, anchor sleep right after your shift and use blackout and ear protection where possible.",
  },
  {
    contentKey: "rec.veg_indian",
    category: "nutrition",
    text: "Adding one extra katori of vegetables to lunch is the simplest upgrade: seasonal sabzi, salad first, or adding vegetables to poha/upma/dal. Seasonal and local produce is usually cheaper and fresher — and frozen vegetables count too.",
  },
  {
    contentKey: "rec.protein_veg",
    category: "nutrition",
    text: "For vegetarian plates, aim for a katori of dal, rajma, chana, or sprouts at both main meals; paneer, curd, and soy chunks are strong additions. Pairing dal with rice or roti improves protein quality. Sprouting pulses at home is low-cost and boosts nutrition.",
  },
  {
    contentKey: "rec.tobacco_quit",
    category: "substance",
    text: "Quitting tobacco at any age reduces risk quickly — improvements begin within weeks. Free national support exists: the tobacco quit line 1800-11-2356. Doctors can discuss aids; this tool never suggests starting, stopping, or changing any medicine.",
  },
  {
    contentKey: "rec.bp_log",
    category: "monitor",
    text: "For a useful home BP log: sit resting 5 minutes, feet flat, back supported, cuff at heart level; take two readings a minute apart, morning and evening for a week, and write them all down with times. Show the written log to your doctor.",
  },
  {
    contentKey: "rec.clinician_questions",
    category: "clinical_review",
    text: "Bring your questions, your written readings, and your medicine list to the consultation. Short appointments go further when the top three questions are decided in advance.",
  },
];

async function main() {
  console.log("[seed-phi] starting…");

  /* demo subject + default consent rows (all denied until user opts in) */
  const subject = await db.phiSubject.upsert({
    where: { id: "phi-demo-subject" },
    create: { id: "phi-demo-subject", label: DEMO_SUBJECT_LABEL },
    update: {},
  });

  const { CONSENT_SCOPES } = await import("../src/modules/phi/contracts");
  for (const scope of CONSENT_SCOPES) {
    await db.phiConsent.upsert({
      where: { subjectId_scope: { subjectId: subject.id, scope } },
      create: { subjectId: subject.id, scope, granted: false },
      update: {},
    });
  }
  console.log(`[seed-phi] subject ${subject.id} ready with ${CONSENT_SCOPES.length} consent scopes (all denied by default)`);

  /* evidence content items (versioned) */
  for (const item of CONTENT_ITEMS) {
    await db.phiContentItem.upsert({
      where: {
        contentKey_version_language: {
          contentKey: item.contentKey,
          version: "demo-1",
          language: "en",
        },
      },
      create: {
        contentKey: item.contentKey,
        version: "demo-1",
        language: "en",
        category: item.category,
        text: item.text,
        sourceAuthority: "ICMR-NIN Dietary Guidelines for Indians 2024 (demo posture)",
        sourceTitle: "Nexura PHI demo content",
        jurisdiction: "IN",
        reviewedBy: "PENDING (demo)",
        reviewedAt: "2026-09-11",
        status: "approved",
      },
      update: { text: item.text },
    });
  }
  console.log(`[seed-phi] ${CONTENT_ITEMS.length} content items ready`);

  console.log("[seed-phi] done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
