/* ============================================================
 * NEXURA PHI — EVIDENCE CONTENT CATALOG (static demo coverage)
 *
 * Extends the DB-backed evidence repository with a static,
 * India-specific catalog of approved demo content items. Rows are
 * shaped exactly like Prisma `PhiContentItem` rows so the content
 * repository can fall back to them when the DB has no approved
 * row for a key.
 *
 * SAFETY POSTURE:
 *  - Plain language, India-specific, no medication doses.
 *  - No disease diagnosis claims — screening/support framing only.
 *  - Every row is demo-posture: reviewedBy is "PENDING (demo)"
 *    until a real clinical review pass happens.
 * ============================================================ */

export type PhiCatalogItem = {
  contentKey: string;
  version: string;
  language: string;
  category: string;
  text: string;
  sourceAuthority: string;
  sourceTitle: string;
  jurisdiction: string;
  reviewedBy: string;
  reviewedAt: string;
  status: string;
};

const AUTHORITY = "ICMR-NIN Dietary Guidelines for Indians 2024 (demo posture)";
const REVIEWED_BY = "PENDING (demo)";
const REVIEWED_AT = "2026-09-11";

export const CATALOG: PhiCatalogItem[] = [
  {
    contentKey: "phi.hydration.summer",
    version: "demo-1",
    language: "en",
    category: "nutrition",
    text: "In Indian summer heat, most adults need more water than they think. Keep a filled bottle or matka within reach and sip every 30-45 minutes; seasonal options count too — nimbu pani without sugar, coconut water, chaas, or plain water with sabja. Pale-yellow urine is a simple daily check; dark urine usually means you need more fluids. If a doctor has asked you to limit fluids for any reason, follow your doctor's plan instead.",
    sourceAuthority: AUTHORITY,
    sourceTitle: "Everyday hydration through the Indian summer (demo content)",
    jurisdiction: "IN",
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
    status: "approved",
  },
  {
    contentKey: "phi.portions.katori.guide",
    version: "demo-1",
    language: "en",
    category: "nutrition",
    text: "A standard katori (about 150 ml) is a practical portion measure at home. A balanced thali can be built as: salad first, 2 rotis or 1 katori rice, 1 katori dal or paneer, 1 large katori sabzi, and 1 katori curd. You do not need to weigh food — using the same katori daily keeps portions honest. Adjust up or down based on your hunger and activity that day, not out of habit.",
    sourceAuthority: AUTHORITY,
    sourceTitle: "Katori-based portion guide for Indian meals (demo content)",
    jurisdiction: "IN",
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
    status: "approved",
  },
  {
    contentKey: "phi.protein.southindian",
    version: "demo-1",
    language: "en",
    category: "nutrition",
    text: "South Indian kitchens already hold strong protein options: sambar and other dal-based kuzhambu, a heavier dal-base rasam, sundal (boiled chana or peanuts), and sprouted moong preparations. The fermentation of idli and dosa batter improves digestibility, and pairing rice with sambar makes the meal's protein more usable. A bowl of curd or a glass of buttermilk rounds out the day. One katori of dal or sambar at both lunch and dinner is a realistic starting target.",
    sourceAuthority: AUTHORITY,
    sourceTitle: "South Indian protein options (demo content)",
    jurisdiction: "IN",
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
    status: "approved",
  },
  {
    contentKey: "phi.plate.bloodsugar.indian",
    version: "demo-1",
    language: "en",
    category: "nutrition",
    text: "A blood-sugar-friendly Indian plate starts with order and balance: vegetables and salad first, then protein — dal, paneer, curd, egg, or fish — and rice or roti last. Keep the grain portion no larger than the vegetables and protein combined. Choose whole grains you actually enjoy, such as millets, brown rice, or regular atta, rather than forcing a food you dislike. If you live with diabetes, your clinician's plan comes first; this plate is general support for everyday meals, not a replacement for care.",
    sourceAuthority: AUTHORITY,
    sourceTitle: "Diabetes-friendly Indian plate basics (demo content)",
    jurisdiction: "IN",
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
    status: "approved",
  },
  {
    contentKey: "phi.cooking.bloodpressure",
    version: "demo-1",
    language: "en",
    category: "nutrition",
    text: "For blood-pressure-friendly cooking, the biggest wins happen before the stove: skip adding raw salt at the table, keep papads, pickles, and packaged namkeens as occasional items rather than daily ones, and taste before adding salt to dal or curries. Build flavour with lemon, tamarind, curry leaves, mustard, jeera, and fresh coriander instead. Check labels on breads, chips, and instant mixes — a lot of salt hides there. Cooking with a little less salt most days beats aiming for perfection.",
    sourceAuthority: AUTHORITY,
    sourceTitle: "BP-friendly cooking for Indian kitchens (demo content)",
    jurisdiction: "IN",
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
    status: "approved",
  },
  {
    contentKey: "phi.sleep.shiftworkers",
    version: "demo-1",
    language: "en",
    category: "sleep",
    text: "Shift work fights the body clock, so anchor sleep to your shift rather than to the clock. Wear dark glasses on the way home after a night shift, keep the room dark and cool with blackout curtains or an eye mask, and ask family to hold calls during your protected sleep block. Keep a fixed 3-4 hour core sleep window plus one nap, and keep tea or coffee to the first half of your shift. Give the same schedule two weeks before judging whether it works for you.",
    sourceAuthority: AUTHORITY,
    sourceTitle: "Sleep for shift workers (demo content)",
    jurisdiction: "IN",
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
    status: "approved",
  },
  {
    contentKey: "phi.activity.walking.beginners",
    version: "demo-1",
    language: "en",
    category: "activity",
    text: "Begin with a plan you cannot fail: 10 easy minutes after your largest meal, five days a week, for two weeks. Add 5 minutes every fortnight until you reach 30-40 minutes, then add a slightly faster middle stretch where talking is possible but singing is not. Early morning or after sunset suits Indian heat; carry water in summer. Walks still count when they are split into smaller blocks across the day.",
    sourceAuthority: AUTHORITY,
    sourceTitle: "Walking plans for beginners (demo content)",
    jurisdiction: "IN",
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
    status: "approved",
  },
  {
    contentKey: "phi.stress.reset.techniques",
    version: "demo-1",
    language: "en",
    category: "mental_wellbeing",
    text: "Two resets fit inside an Indian workday. Breathing: inhale for 4 counts and exhale slowly for 6-8 counts, for 10 cycles — longer exhales calm the body. Grounding: name 5 things you can see, 4 you can hear, and 2 you can touch. Add one daily anchor that is truly yours — a walk, prayer, music, or calling a friend. If stress feels unmanageable, Tele-MANAS (14416) offers free, confidential support in Indian languages.",
    sourceAuthority: AUTHORITY,
    sourceTitle: "Everyday stress reset techniques (demo content)",
    jurisdiction: "IN",
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
    status: "approved",
  },
  {
    contentKey: "phi.labs.hba1c.followup",
    version: "demo-1",
    language: "en",
    category: "monitoring",
    text: "Useful HbA1c questions for your next appointment: What is my target, and is it different for my age? How often should this test be repeated for me? What would you like me to change first — meals, movement, or sleep? Which symptoms should prompt me to contact you sooner? Carry your reports in date order so the trend, not a single value, drives the discussion.",
    sourceAuthority: AUTHORITY,
    sourceTitle: "HbA1c follow-up questions (demo content)",
    jurisdiction: "IN",
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
    status: "approved",
  },
  {
    contentKey: "phi.safety.when.doctor",
    version: "demo-1",
    language: "en",
    category: "safety",
    text: "See a doctor promptly rather than waiting if something feels different from your usual pattern, keeps returning, or is getting worse over weeks. Seek urgent care for warning signs such as chest pain, one-sided weakness or slurred speech, trouble breathing, fainting, or uncontrolled bleeding — go to the nearest hospital or call 108. This tool can help you organise information, but only a qualified doctor can interpret your health.",
    sourceAuthority: AUTHORITY,
    sourceTitle: "When to see a doctor — general guidance (demo content)",
    jurisdiction: "IN",
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
    status: "approved",
  },
];
