/* ============================================================
   NEXURA — Know-Your-Health OFFLINE DATA TABLES
   Curated, deterministic clinical reference data used by the
   offline engine (src/lib/kyh/offline-engine.ts) so every KYH
   tool can ALWAYS answer, even when both AI providers are
   unavailable (missing key, quota, network). Indian context:
   ICMR / ICMR-INDIAB / NFHS-5 / ACC-AHA reference points.
   Educational use only — never a diagnosis.
   ============================================================ */

/* ---------- symptoms checker ---------- */

export const SYMPTOM_EMERGENCY_KEYWORDS: [RegExp, string][] = [
  [/chest pain|chest pressure|pain in (my )?chest|seene? me dard/, "chest pain — possible cardiac emergency"],
  [/can'?t breathe|cannot breathe|difficulty breathing|severe breathless|saans (nahi|lesh)/, "severe breathing difficulty"],
  [/unconscious|fainted|collapsed/, "unconsciousness / collapse"],
  [/seizure|fits|convulsion/, "active seizure"],
  [/stroke|face droop|slurred speech|weakness on one side|one side (of my )?body (is )?(numb|weak)/, "possible stroke signs"],
  [/heavy bleeding|severe bleeding|bleeding won'?t stop/, "uncontrolled bleeding"],
  [/suicid|kill myself|end my life|want to die|self.?harm/, "self-harm risk — needs immediate support"],
  [/vomiting blood|blood in vomit/, "vomiting blood"],
  [/coughing blood|blood in (my )?sputum|haemoptysis/, "coughing blood"],
];

export const SYMPTOM_HIGH_KEYWORDS: [RegExp, string][] = [
  [/worst headache|thunderclap|sudden severe headache/, "sudden severe headache"],
  [/severe abdominal pain|unbearable stomach pain/, "severe abdominal pain"],
  [/fever.*(3|three|4|four|5|five) day|fever (above|over) 10[3-5]/, "prolonged / very high fever"],
  [/stiff neck.*fever|fever.*stiff neck/, "fever with neck stiffness"],
  [/dehydrat|not passed urine (for|in) 12/, "significant dehydration"],
];

interface CauseRule {
  re: RegExp;
  condition: string;
  likelihood: "low" | "moderate" | "high";
  note: string;
  specialty: string;
  actions?: string[];
}

export const SYMPTOM_CAUSE_RULES: CauseRule[] = [
  {
    re: /fever|bukhar|temperature|chills/,
    condition: "Viral fever / seasonal infection",
    likelihood: "high",
    note: "Fever with body ache is most often a self-limiting viral illness, common through India's season changes.",
    specialty: "General Physician",
    actions: ["Rest and drink 3+ litres of fluids (ORS, coconut water, soups)", "Track temperature every 6 hours; paracetamol as per label for comfort"],
  },
  {
    re: /dengue|platelet|mosquito/,
    condition: "Dengue or other mosquito-borne fever",
    likelihood: "moderate",
    note: "In dengue season, fever with severe body ache needs a NS1/dengue test.",
    specialty: "General Physician",
    actions: ["Get a CBC + dengue NS1 antigen test", "Avoid NSAIDs (ibuprofen/diclofenac) — use paracetamol only"],
  },
  {
    re: /cough|cold|sore throat|throat pain|runny nose|galay/,
    condition: "Upper respiratory tract infection (cold/cough)",
    likelihood: "high",
    note: "Cough with or without fever is commonly viral; persistent cough beyond 2 weeks needs TB screening.",
    specialty: "General Physician",
    actions: ["Warm salt-water gargles and steam inhalation twice a day", "See a doctor if cough lasts more than 2 weeks"],
  },
  {
    re: /headache|sir dard|migraine/,
    condition: "Tension headache / migraine",
    likelihood: "moderate",
    note: "One-sided throbbing pain with light sensitivity suggests migraine; band-like pressure suggests tension headache.",
    specialty: "General Physician / Neurologist",
    actions: ["Rest in a dim room, hydrate; note trigger foods and skipped meals"],
  },
  {
    re: /stomach|abdomen|pet (me|dard)|belly|gastric|acidity|bloating/,
    condition: "Acidity / gastritis or indigestion",
    likelihood: "moderate",
    note: "Spicy-oily food, irregular meals and stress commonly cause upper abdominal burning or bloating.",
    specialty: "Gastroenterologist",
    actions: ["Eat smaller, regular meals; avoid very spicy food and tea on an empty stomach", "Antacids as per label; persistent pain needs an evaluation"],
  },
  {
    re: /loose motion|diarrhoea|diarrhea|motions|dast|food poison/,
    condition: "Acute gastroenteritis (food/water infection)",
    likelihood: "high",
    note: "Sudden loose motions, often with cramps, usually follow contaminated food or water.",
    specialty: "General Physician",
    actions: ["ORS after every loose stool — 200-300 ml; continue light home food", "See a doctor if there is blood in stool, or motions exceed 6 a day"],
  },
  {
    re: /thirst(y)?|urinat(e|ing) (a lot|frequently)|weight loss.*sugar|sugar (high|problem)|diabet/,
    condition: "High blood sugar / undiagnosed diabetes",
    likelihood: "moderate",
    note: "Excess thirst, frequent urination and weight loss together are classic sugar-warning signs in India.",
    specialty: "General Physician / Endocrinologist",
    actions: ["Get fasting sugar + HbA1c tested at a lab", "Cut sugary drinks until tested"],
  },
  {
    re: /joint|knee|back pain|kamar|arthritis|ghutn/,
    condition: "Mechanical joint / back pain",
    likelihood: "moderate",
    note: "Joint pain that worsens with stairs and eases with rest is usually mechanical; Vitamin D deficiency is very common in India.",
    specialty: "Orthopaedic specialist",
    actions: ["Gentle stretching, warm compress; check Vitamin D and B12 levels"],
  },
  {
    re: /rash|itch|skin|khujli|pimples|acne|fungal/,
    condition: "Skin infection / allergy or dermatitis",
    likelihood: "moderate",
    note: "Itchy ring-like patches in Indian humidity are often fungal; sudden rashes after food/medicine suggest allergy.",
    specialty: "Dermatologist",
    actions: ["Keep the area dry; avoid self-applying steroid creams", "See a dermatologist if spreading, painful, or with fever"],
  },
  {
    re: /anxiety|panic|stress|depress|sad|insomnia|neend.*nahi/,
    condition: "Stress / anxiety-related symptoms",
    likelihood: "moderate",
    note: "Palpitations, restlessness and poor sleep with normal physical tests often point to stress responses.",
    specialty: "Psychiatrist / Mental wellness support",
    actions: ["Try 4-7-8 or box breathing; a 20-minute daily walk helps measurably", "If mood stays low 2+ weeks, book a mental-health consult"],
  },
  {
    re: /palpitation|heart beating fast|heartbeat|ghabrahat/,
    condition: "Palpitations (often benign, sometimes cardiac)",
    likelihood: "moderate",
    note: "Caffeine, anaemia, thyroid and anxiety commonly cause a fast-beating heart; new palpitations deserve an ECG.",
    specialty: "Cardiologist",
    actions: ["Cut coffee/energy drinks; get an ECG and Hb + TSH checked"],
  },
  {
    re: /vertigo|dizzy|dizziness|chakkar/,
    condition: "Vertigo (inner-ear) or low BP/anaemia",
    likelihood: "moderate",
    note: "Room-spinning dizziness that changes with head position suggests BPPV; lightheadedness on standing suggests dehydration, anaemia or low BP.",
    specialty: "ENT specialist / General Physician",
    actions: ["Rise slowly from bed; hydrate; get Hb and BP checked"],
  },
];

export const SYMPTOM_DEFAULT_REDACTIONS = [
  "Chest pain, pressure or pain spreading to arm/jaw",
  "Severe difficulty breathing",
  "Sudden weakness or slurred speech (stroke signs)",
  "Fainting, seizures, or confusion",
  "Vomiting blood, black stools, or uncontrolled bleeding",
  "Fever lasting more than 5 days, or fever with stiff neck",
];

/* ---------- blood pressure (ACC/AHA 2017) ---------- */

export const BP_RECOMMENDATIONS: Record<string, string[]> = {
  Normal: [
    "Maintain current lifestyle — 30 min brisk walk 5 days a week",
    "Keep salt under 5 g/day (one teaspoon incl. pickles, papad, chutney)",
    "Recheck BP every 6-12 months",
  ],
  Elevated: [
    "Cut added salt; reduce pickles/papad portions",
    "Add 30-40 min daily walking or yoga (pranayama helps BP)",
    "Recheck home BP twice a week, seated, after 5 min rest",
  ],
  "Stage 1 Hypertension": [
    "Start a DASH-style Indian diet: more dal, sabzi, fruits, whole grains",
    "Reduce salt to <5 g/day; avoid packaged namkeen and instant noodles",
    "Limit tea/coffee to 2 cups; no tobacco; alcohol minimal",
    "Recheck BP daily for 2 weeks and carry the log to a physician",
  ],
  "Stage 2 Hypertension": [
    "See a physician within days — you likely need a medication evaluation",
    "Strict salt restriction and a daily BP log until reviewed",
    "Avoid heavy lifting and straining until BP is controlled",
  ],
  "Hypertensive Crisis": [
    "Seek medical care NOW — readings ≥180/120 need same-day assessment",
    "Rest quietly and recheck after 5 minutes; if still ≥180/120 go to an emergency room",
    "Do NOT double your BP medicines on your own",
  ],
};

export const BP_DOCTOR_NOTE: Record<string, string> = {
  Normal: "Routine annual check is enough if you have no other risk factors.",
  Elevated: "If elevated readings persist 2+ weeks, show the log to a physician.",
  "Stage 1 Hypertension": "Book a physician visit within 1-2 weeks with your BP log for a medication decision.",
  "Stage 2 Hypertension": "See a doctor within days — Stage 2 usually needs prescription treatment.",
  "Hypertensive Crisis": "Go to an emergency room immediately, especially with chest pain, headache or blurred vision.",
};

/* ---------- diabetes (ICMR-INDIAB aligned) ---------- */

export const DIABETES_DIET_TIPS = [
  "Prefer whole-wheat/missi roti or ragi over white rice; pair rice with dal + sabzi to blunt sugar spikes",
  "Eat vegetables and dal FIRST, roti/rice last — this simple order lowers post-meal spikes",
  "Snack on roasted chana, buttermilk (chaas), or a handful of nuts instead of biscuits/namkeen",
  "Walk 15 minutes after each major meal — post-meal walks measurably cut sugar spikes",
  "Choose whole fruits (guava, apple, papaya) over juice; keep mango/banana portions small",
  "Use less oil overall; switch to mustard/groundnut/olive oil and rotate",
];

/* ---------- mental wellness ---------- */

export const CRISIS_RESOURCES = [
  { name: "Tele-MANAS (Govt of India)", phone: "14416", hours: "24x7, free" },
  { name: "iCall", phone: "9152987821", hours: "Mon-Sat 8am-10pm" },
  { name: "Vandrevala Foundation", phone: "1860-2662-345", hours: "24x7" },
  { name: "AASRA", phone: "9820466726", hours: "24x7" },
];

export const GROUNDING_EXERCISES = [
  "5-4-3-2-1 grounding: name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste",
  "Box breathing: inhale 4 counts → hold 4 → exhale 4 → hold 4; repeat for 3-4 minutes",
  "Body scan: lie down and slowly move attention from toes to head, relaxing each part",
  "Cold water reset: splash cold water on the face or hold a cold bottle — this slows the heart rate",
];

export const MENTAL_RECOMMENDATIONS = [
  "20 minutes of daylight walking (morning or evening) — proven mood support",
  "Keep a fixed sleep and wake time; protect 7-8 hours",
  "Talk to one trusted person today — a friend, sibling or parent",
  "Write down worries in a notebook for 10 minutes, then close it — 'worry journaling'",
  "Limit doom-scrolling, especially after 9 pm",
];

/* ---------- sleep ---------- */

export const SLEEP_HYGIENE_TIPS = [
  "Fixed wake-up time daily — even weekends (this anchors the body clock)",
  "No chai/coffee after 4 pm; caffeine stays active 8+ hours for many people",
  "Lighter dinner at least 2 hours before bed; avoid heavy fried food late",
  "Screens away 60 min before bed; keep the phone out of arm's reach",
  "Bedroom cool, dark and quiet; a lukewarm shower 1 hour before bed helps",
];

/* ---------- drug knowledge (class level, common Indian meds) ---------- */

export interface DrugClass {
  re: RegExp;
  label: string;
  cls: string;
}

export const DRUG_CLASSES: DrugClass[] = [
  { re: /aspirin|ecosprin|disprin|\basa\b/, label: "Aspirin (antiplatelet)", cls: "antiplatelet" },
  { re: /clopidogrel|plavix|clavix/, label: "Clopidogrel (antiplatelet)", cls: "antiplatelet2" },
  { re: /warfarin|acitrom|coumadin|acenocoumarol/, label: "Warfarin/Acitrom (blood thinner)", cls: "anticoagulant" },
  { re: /apixaban|rivaroxaban|dabigatran|eliquis|xarelto/, label: "DOAC (blood thinner)", cls: "anticoagulant" },
  { re: /ibuprofen|diclofenac|naproxen|combiflam|voveran|ketorolac|aceclofenac|etoricoxib|piroxicam/, label: "NSAID painkiller", cls: "nsaid" },
  { re: /paracetamol|acetaminophen|dolo|crocin|calpol|metacin/, label: "Paracetamol", cls: "paracetamol" },
  { re: /metformin|glucophage|glycomet/, label: "Metformin", cls: "metformin" },
  { re: /glimepiride|glibenclamide|gliclazide|glipizide|amaryl/, label: "Sulfonylurea (sugar tablet)", cls: "sulfonylurea" },
  { re: /insulin|lantus|huminsulin|novorapid|actrapid/, label: "Insulin", cls: "insulin" },
  { re: /atorvastatin|rosuvastatin|simvastatin|pravastatin|storvas|rosutor/, label: "Statin (cholesterol)", cls: "statin" },
  { re: /omeprazole|pantoprazole|rabeprazole|esomeprazole|lansoprazole|pan\s?40/, label: "PPI (acidity)", cls: "ppi" },
  { re: /amlodipine|nifedipine|cilnidipine/, label: "Calcium-channel blocker (BP)", cls: "ccb" },
  { re: /telmisartan|losartan|ramipril|enalapril|olmesartan|lisinopril/, label: "ARB/ACE inhibitor (BP)", cls: "arb" },
  { re: /metoprolol|atenolol|bisoprolol|propranolol|carvedilol/, label: "Beta-blocker", cls: "beta" },
  { re: /furosemide|lasix|torsemide|hydrochlorothiazide|chlorthalidone|amiloride/, label: "Diuretic (water pill)", cls: "diuretic" },
  { re: /sertraline|fluoxetine|escitalopram|citalopram|paroxetine|fluvoxamine/, label: "SSRI (antidepressant)", cls: "ssri" },
  { re: /alprazolam|clonazepam|diazepam|lorazepam|etizolam/, label: "Benzodiazepine (sleep/anxiety)", cls: "benzo" },
  { re: /tramadol|codeine|tapentadol|morphine|oxycodone/, label: "Opioid-type painkiller", cls: "opioid" },
  { re: /levothyroxine|thyronorm|eltroxin|thyroxine/, label: "Levothyroxine (thyroid)", cls: "t4" },
  { re: /shelcal|calcium|calcitriol/, label: "Calcium supplement", cls: "mineral" },
  { re: /iron|ferrous|orofer/, label: "Iron supplement", cls: "mineral" },
  { re: /ciprofloxacin|levofloxacin|ofloxacin|moxifloxacin/, label: "Fluoroquinolone antibiotic", cls: "quinolone" },
  { re: /azithromycin|clarithromycin|erythromycin/, label: "Macrolide antibiotic", cls: "macrolide" },
  { re: /cetirizine|levocetirizine|hydroxyzine|chlorpheniramine|avil|fexofenadine/, label: "Antihistamine", cls: "antihistamine" },
  { re: /metronidazole|tinidazole|ornidazole/, label: "Metronidazole-type antibiotic", cls: "nitroimidazole" },
];

export interface InteractionRule {
  a: string;
  b: string;
  severity: "mild" | "moderate" | "severe" | "contraindicated";
  mechanism: string;
  clinicalEffect: string;
  recommendation: string;
}

export const INTERACTION_RULES: InteractionRule[] = [
  { a: "nsaid", b: "anticoagulant", severity: "contraindicated", mechanism: "NSAIDs irritate the stomach lining and add onto the blood thinner's anti-clotting effect", clinicalEffect: "High risk of serious GI bleeding (black stools, vomiting blood)", recommendation: "Avoid this combination — ask your doctor about paracetamol for pain instead" },
  { a: "nsaid", b: "antiplatelet", severity: "severe", mechanism: "NSAID + aspirin together multiply stomach-bleed risk and can blunt aspirin's heart protection", clinicalEffect: "Stomach ulcers and GI bleeding", recommendation: "Do not self-add NSAIDs; if unavoidable, your doctor may add a PPI" },
  { a: "nsaid", b: "antiplatelet2", severity: "severe", mechanism: "NSAIDs add bleeding risk on top of clopidogrel and irritate the stomach", clinicalEffect: "Increased bleeding and ulcer risk", recommendation: "Use paracetamol instead; consult your doctor before any NSAID course" },
  { a: "nsaid", b: "ssri", severity: "moderate", mechanism: "SSRIs already mildly increase bleeding tendency; NSAIDs add stomach irritation", clinicalEffect: "Roughly doubles upper-GI bleed risk vs either alone", recommendation: "Prefer paracetamol; if combined, take after food and watch for black stools" },
  { a: "nsaid", b: "arb", severity: "moderate", mechanism: "NSAIDs constrict kidney vessels while ARBs relax them — kidney filtration drops ('triple whammy' with a diuretic)", clinicalEffect: "Rising creatinine, swelling, BP control worsens", recommendation: "Short courses only with doctor's knowledge; hydrate well" },
  { a: "nsaid", b: "diuretic", severity: "moderate", mechanism: "NSAIDs blunt diuretics' effect and stress the kidneys", clinicalEffect: "Swelling, BP rise, kidney strain", recommendation: "Ask your doctor before adding any NSAID" },
  { a: "antiplatelet", b: "anticoagulant", severity: "contraindicated", mechanism: "Two different anti-clotting systems stack", clinicalEffect: "Major bleeding risk — only used together in specific cardiac situations", recommendation: "Only combine if your cardiologist explicitly prescribed it" },
  { a: "antiplatelet", b: "antiplatelet2", severity: "moderate", mechanism: "Dual antiplatelet therapy (DAPT) — intentional after stents/heart attack but risky when self-added", clinicalEffect: "Easy bruising and bleeding", recommendation: "Fine if cardiologist-prescribed; never start aspirin yourself while on clopidogrel" },
  { a: "sulfonylurea", b: "insulin", severity: "moderate", mechanism: "Both push blood sugar down via different routes", clinicalEffect: "Hypoglycaemia — shakiness, sweating, confusion", recommendation: "Monitor sugars closely; ask your doctor whether a dose adjustment is planned" },
  { a: "statin", b: "macrolide", severity: "moderate", mechanism: "Macrolides (esp. clarithromycin/erythromycin) block statin breakdown", clinicalEffect: "Muscle aches, dark urine — rarely rhabdomyolysis", recommendation: "Mention your statin if an antibiotic is prescribed; azithromycin is usually the safer macrolide" },
  { a: "t4", b: "mineral", severity: "moderate", mechanism: "Calcium and iron bind levothyroxine in the gut", clinicalEffect: "Thyroid medicine stops working — fatigue and weight gain return", recommendation: "Take levothyroxine alone on an empty stomach; keep calcium/iron 4 hours apart" },
  { a: "t4", b: "ppi", severity: "mild", mechanism: "Reduced stomach acid can slightly reduce levothyroxine absorption", clinicalEffect: "Marginally lower thyroid control", recommendation: "Keep taking both, but recheck TSH after any PPI course" },
  { a: "opioid", b: "benzo", severity: "severe", mechanism: "Both sedate the breathing centre", clinicalEffect: "Dangerous drowsiness, slowed breathing, accidents", recommendation: "Avoid completely unless a specialist prescribes both with monitoring" },
  { a: "opioid", b: "ssri", severity: "moderate", mechanism: "Tramadol with SSRIs can over-stimulate serotonin pathways and lower the seizure threshold", clinicalEffect: "Agitation, tremor, sweating (serotonin syndrome); rarely seizures", recommendation: "Tell your doctor you take an SSRI before starting tramadol" },
  { a: "quinolone", b: "mineral", severity: "moderate", mechanism: "Calcium/iron chelate fluoroquinolones in the gut", clinicalEffect: "The antibiotic may fail to work", recommendation: "Space calcium/iron at least 2 hours away from the antibiotic" },
  { a: "paracetamol", b: "anticoagulant", severity: "mild", mechanism: "Sustained high-dose paracetamol can modestly raise INR", clinicalEffect: "Slight increase in bleeding risk with regular use", recommendation: "Fine for occasional use; keep total dose under 3 g/day and recheck INR if using daily" },
  { a: "antihistamine", b: "benzo", severity: "mild", mechanism: "Additive drowsiness", clinicalEffect: "Next-morning grogginess, reduced alertness", recommendation: "Avoid driving; prefer non-sedating antihistamines like fexofenadine" },
  { a: "nitroimidazole", b: "anticoagulant", severity: "mild", mechanism: "Metronidazole can enhance warfarin's effect", clinicalEffect: "Mildly increased bleeding tendency with warfarin", recommendation: "INR check mid-course if you are on warfarin" },
];

export const CONDITION_WARNINGS: { re: RegExp; cls: string[]; warning: string }[] = [
  { re: /pregnan/, cls: ["nsaid", "anticoagulant"], warning: "NSAIDs and blood thinners are unsafe in pregnancy — paracetamol is the usual pain option (confirm with your obstetrician)" },
  { re: /kidney|renal|creatinine/, cls: ["nsaid", "metformin"], warning: "With kidney disease, NSAIDs worsen kidney function and metformin dosing needs review" },
  { re: /ulcer|gastrit|stomach bleed/, cls: ["nsaid", "antiplatelet", "anticoagulant"], warning: "With a history of stomach ulcers, these medicines can trigger re-bleeding" },
  { re: /asthma/, cls: ["nsaid"], warning: "NSAIDs can trigger asthma attacks in some people" },
  { re: /diabet|sugar/, cls: ["sulfonylurea"], warning: "With diabetes, watch for low-sugar episodes (skipped meals, sweating) while on sulfonylureas" },
  { re: /heart failure/, cls: ["nsaid"], warning: "NSAIDs cause fluid retention and can worsen heart failure" },
];

/* ---------- lab reference ranges (Indian / ICMR aligned) ---------- */

export interface LabEntry {
  names: RegExp;
  unit: string;
  range: string;
  lo: number | null;
  hi: number | null;
  meaning: string;
}

export const LAB_TABLE: LabEntry[] = [
  { names: /hemoglobin|haemoglobin|\bhb\b/, unit: "g/dL", range: "13.0-17.0 (male), 12.0-15.0 (female)", lo: 12, hi: 17, meaning: "Carries oxygen. Low = anaemia (very common in Indian women — often iron deficiency)" },
  { names: /\bwbc\b|\btlc\b|leucocyte|leukocyte/, unit: "/µL", range: "4,000-11,000", lo: 4000, hi: 11000, meaning: "Infection-fighting cells. High suggests infection; low can follow viral illness" },
  { names: /platelet/, unit: "/µL", range: "150,000-450,000", lo: 150000, hi: 450000, meaning: "Clotting cells. Low counts occur in dengue and viral fevers — monitor closely if feverish" },
  { names: /\brbc\b|red (blood )?cell/, unit: "mill/mm³", range: "4.5-5.9 (male), 4.1-5.1 (female)", lo: 4.1, hi: 5.9, meaning: "Red cell count — supports the haemoglobin picture" },
  { names: /\bmcv\b/, unit: "fL", range: "80-100", lo: 80, hi: 100, meaning: "Red cell size. Small cells suggest iron deficiency; large cells suggest B12/folate deficiency" },
  { names: /\bpcv\b|hematocrit|haematocrit/, unit: "%", range: "40-50 (male), 36-46 (female)", lo: 36, hi: 50, meaning: "Percentage of blood made of red cells" },
  { names: /fasting (blood )?(sugar|glucose)|\bfbs\b/, unit: "mg/dL", range: "70-99 (normal), 100-125 (pre-diabetes), ≥126 (diabetes)", lo: 70, hi: 99, meaning: "Sugar after 8+ hours fasting — the primary diabetes screening test" },
  { names: /post.?meal|\bpp\b (sugar|glucose)|ppbs/, unit: "mg/dL", range: "<140 (normal), 140-199 (pre-diabetes), ≥200 (diabetes)", lo: 70, hi: 140, meaning: "Sugar 2 hours after a meal" },
  { names: /hba1c|\ba1c\b|glycated/, unit: "%", range: "<5.7 (normal), 5.7-6.4 (pre-diabetes), ≥6.5 (diabetes)", lo: 4, hi: 5.7, meaning: "3-month average sugar — the key diabetes control marker (target <7 if diabetic)" },
  { names: /\btsh\b|thyroid stimulating/, unit: "µIU/mL", range: "0.4-4.0", lo: 0.4, hi: 4.0, meaning: "Thyroid control signal. High = underactive thyroid (weight gain, tiredness); low = overactive" },
  { names: /creatinine/, unit: "mg/dL", range: "0.7-1.3 (male), 0.6-1.1 (female)", lo: 0.6, hi: 1.3, meaning: "Kidney filtration marker; rising values need a doctor's review" },
  { names: /\burea\b|\bbun\b/, unit: "mg/dL", range: "15-40", lo: 15, hi: 40, meaning: "Kidney/protein turnover marker" },
  { names: /uric acid/, unit: "mg/dL", range: "3.5-7.2 (male), 2.6-6.0 (female)", lo: 2.6, hi: 7.2, meaning: "High levels cause gout (big-toe joint pain); limit red meat, alcohol, organ meat" },
  { names: /sgpt|\balt\b/, unit: "U/L", range: "up to 41 (male), 33 (female)", lo: 0, hi: 41, meaning: "Liver enzyme. Fatty liver (very common in India), alcohol or medicines raise it" },
  { names: /sgot|\bast\b/, unit: "U/L", range: "up to 40", lo: 0, hi: 40, meaning: "Liver/muscle enzyme" },
  { names: /bilirubin/, unit: "mg/dL", range: "0.3-1.2", lo: 0.3, hi: 1.2, meaning: "Jaundice marker; mildly raised values with fasting are common and benign" },
  { names: /total cholesterol/, unit: "mg/dL", range: "<200 desirable", lo: 0, hi: 200, meaning: "Overall cholesterol burden" },
  { names: /\bldl\b/, unit: "mg/dL", range: "<100 (ideal), <130 (acceptable)", lo: 0, hi: 100, meaning: "The artery-clogging cholesterol — primary heart-risk target" },
  { names: /\bhdl\b/, unit: "mg/dL", range: ">40 (male), >50 (female)", lo: 40, hi: 200, meaning: "Protective cholesterol — higher is better; exercise raises it" },
  { names: /triglyceride|\btg\b/, unit: "mg/dL", range: "<150", lo: 0, hi: 150, meaning: "Blood fat driven by sweets, fried food, alcohol and refined carbs" },
  { names: /vitamin d|25.?oh/, unit: "ng/mL", range: "30-100 (deficient <20, insufficient 20-30)", lo: 20, hi: 100, meaning: "Bone + immunity vitamin; deficiency is near-universal in urban India" },
  { names: /vitamin b12|cobalamin/, unit: "pg/mL", range: "200-900 (deficient <200)", lo: 200, hi: 900, meaning: "Nerve + blood vitamin; low levels are common in vegetarians — causes tingling and fatigue" },
  { names: /ferritin/, unit: "ng/mL", range: "30-400 (male), 13-150 (female)", lo: 13, hi: 400, meaning: "Iron stores — the best single test for iron deficiency" },
  { names: /egfr|\bgfr\b/, unit: "mL/min/1.73m²", range: ">90 (normal), <60 for 3+ months = CKD", lo: 60, hi: 200, meaning: "Kidney filtration estimate" },
  { names: /sodium|\bna\+/, unit: "mmol/L", range: "135-145", lo: 135, hi: 145, meaning: "Salt-water balance" },
  { names: /potassium|\bk\+/, unit: "mmol/L", range: "3.5-5.1", lo: 3.5, hi: 5.1, meaning: "Heart-rhythm electrolyte — abnormal values need prompt attention" },
  { names: /\besr\b/, unit: "mm/hr", range: "up to 15 (male), 20 (female)", lo: 0, hi: 20, meaning: "Non-specific inflammation marker" },
  { names: /\bcrp\b/, unit: "mg/L", range: "<5", lo: 0, hi: 5, meaning: "Active inflammation/infection marker" },
  { names: /\biron\b/, unit: "µg/dL", range: "60-170", lo: 60, hi: 170, meaning: "Circulating iron" },
  { names: /\bt3\b|triiodothyronine/, unit: "ng/dL", range: "80-200", lo: 80, hi: 200, meaning: "Active thyroid hormone" },
  { names: /\bt4\b|thyroxine/, unit: "µg/dL", range: "5.4-11.7", lo: 5.4, hi: 11.7, meaning: "Main thyroid hormone" },
  { names: /calcium/, unit: "mg/dL", range: "8.6-10.3", lo: 8.6, hi: 10.3, meaning: "Bone and muscle electrolyte" },
];

/* ---------- health quiz bank (curated, Indian context) ---------- */

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

export const QUIZ_BANK: QuizQuestion[] = [
  { id: "q1", question: "What is the normal fasting blood sugar range for a healthy adult?", options: ["70-99 mg/dL", "100-125 mg/dL", "126-180 mg/dL", "200+ mg/dL"], correctIndex: 0, explanation: "70-99 mg/dL is normal; 100-125 is pre-diabetes; ≥126 on two occasions suggests diabetes.", topic: "Diabetes" },
  { id: "q2", question: "How much added salt per day does WHO recommend as a maximum?", options: ["5 g (1 teaspoon)", "10 g (2 teaspoons)", "15 g", "No limit"], correctIndex: 0, explanation: "Under 5 g/day — Indian diets (pickles, papad, namkeen) often exceed this 3-4x.", topic: "Nutrition" },
  { id: "q3", question: "Which vitamin deficiency is most widespread in urban India despite abundant sunlight?", options: ["Vitamin C", "Vitamin D", "Vitamin B12", "Vitamin K"], correctIndex: 1, explanation: "Studies report Vitamin D deficiency in 70-90% of urban Indians.", topic: "Nutrition" },
  { id: "q4", question: "Which mosquito spreads dengue?", options: ["Culex", "Anopheles", "Aedes aegypti", "Mansonia"], correctIndex: 2, explanation: "Aedes aegypti — it bites in daytime and breeds in clean stored water.", topic: "Diseases" },
  { id: "q5", question: "Normal adult resting heart rate is roughly:", options: ["40-60 beats/min", "60-100 beats/min", "100-140 beats/min", "140-180 beats/min"], correctIndex: 1, explanation: "60-100 bpm at rest; regular athletes can be lower.", topic: "Heart" },
  { id: "q6", question: "First aid for a minor burn is:", options: ["Apply toothpaste", "Apply ice directly", "Cool running water 10-20 min", "Break the blister"], correctIndex: 2, explanation: "Cool running water for 10-20 min; never ice, toothpaste or ghee.", topic: "First Aid" },
  { id: "q7", question: "BCG vaccine protects against:", options: ["Polio", "Tuberculosis", "Hepatitis B", "Measles"], correctIndex: 1, explanation: "BCG is given at birth in India's UIP schedule for TB protection.", topic: "Vaccination" },
  { id: "q8", question: "Which pairing best prevents iron-deficiency anaemia?", options: ["Tea with meals", "Iron-rich food + vitamin C (lemon, amla)", "Only milk-based diet", "Skipping breakfast"], correctIndex: 1, explanation: "Vitamin C multiplies plant-iron absorption; tea/coffee with meals blocks it.", topic: "Nutrition" },
  { id: "q9", question: "Blood pressure at or above which is Stage-2 hypertension (ACC/AHA)?", options: ["120/80", "130/80", "140/90", "180/120"], correctIndex: 2, explanation: "≥140/90 = Stage 2; ≥180/120 = hypertensive crisis needing urgent care.", topic: "Heart" },
  { id: "q10", question: "How long should hands be washed with soap for proper hygiene?", options: ["5 seconds", "At least 20 seconds", "1 minute strictly with hot water", "Soap is optional"], correctIndex: 1, explanation: "20 seconds with soap covers the full hand surface effectively.", topic: "Hygiene" },
  { id: "q11", question: "Which is the healthiest everyday snack for a pre-diabetic?", options: ["Glucose biscuits", "Roasted chana / murmura", "Banana chips", "Mawa cake"], correctIndex: 1, explanation: "Roasted chana has protein + fiber and a low glycaemic load.", topic: "Diabetes" },
  { id: "q12", question: "Tuberculosis most commonly affects which organ?", options: ["Liver", "Lungs", "Kidneys", "Brain"], correctIndex: 1, explanation: "Pulmonary TB is the commonest form — cough >2 weeks needs testing.", topic: "Diseases" },
  { id: "q13", question: "Recommended physical activity for adults per WHO is:", options: ["75 min/week moderate", "150 min/week moderate", "300 min/week vigorous", "Only gym counts"], correctIndex: 1, explanation: "150 min moderate (brisk walk) or 75 min vigorous activity weekly.", topic: "Lifestyle" },
  { id: "q14", question: "ORS (oral rehydration solution) works because it contains:", options: ["Only water", "Water + salt + sugar in a fixed ratio", "Antibiotics", "Only electrolytes"], correctIndex: 1, explanation: "The precise salt+sugar ratio drives water absorption in the gut — a life-saving Indian innovation.", topic: "First Aid" },
  { id: "q15", question: "Which feature in a mole needs a dermatologist's check (ABCDE rule)?", options: ["Asymmetry / irregular border / colour change", "Itching only once", "Size under 3 mm", "Appears in childhood"], correctIndex: 0, explanation: "Asymmetry, Border irregularity, Colour variation, Diameter >6 mm, Evolution — any one warrants review.", topic: "Skin" },
];

/* ---------- diet planner (Indian templates) ---------- */

export interface MealItem {
  meal: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  recipe: string;
}

export const DIET_TEMPLATES: Record<
  string,
  { breakfast: MealItem[]; lunch: MealItem[]; dinner: MealItem[]; snacks: MealItem[] }
> = {
  vegetarian: {
    breakfast: [
      { meal: "2 besan chilla with mint chutney + 1 glass buttermilk", calories: 300, protein: 14, carbs: 40, fat: 8, recipe: "Besan batter with onion-tomato; cook on tawa 3 min each side" },
      { meal: "Vegetable poha + lemon + peanuts", calories: 320, protein: 8, carbs: 55, fat: 9, recipe: "Rinse poha; toss with turmeric, veggies, peanuts and lemon" },
      { meal: "2 idli + sambar + 1 tsp chutney", calories: 290, protein: 10, carbs: 52, fat: 5, recipe: "Steam idli batter 10 min; pair with hot sambar" },
      { meal: "Masala oats with vegetables + peanuts", calories: 310, protein: 11, carbs: 48, fat: 8, recipe: "Cook oats with carrot, peas, onion and spices for 5 min" },
      { meal: "Ragi dosa + sambar", calories: 300, protein: 11, carbs: 46, fat: 7, recipe: "Ferment ragi-rice batter overnight; cook thin dosas" },
      { meal: "Upma with vegetables + curd", calories: 310, protein: 9, carbs: 50, fat: 8, recipe: "Roast rava; cook with veggies, mustard tadka" },
      { meal: "Stuffed moong-dal chilla + green chutney", calories: 305, protein: 15, carbs: 38, fat: 8, recipe: "Soak and grind moong dal; cook thin chillas" },
    ],
    lunch: [
      { meal: "2 phulka + dal tadka + bhindi sabzi + curd", calories: 450, protein: 18, carbs: 62, fat: 12, recipe: "Roti on tawa; dal pressure-cooked with tadka; okra stir-fried" },
      { meal: "1.5 cup brown rice + rajma + salad", calories: 480, protein: 17, carbs: 70, fat: 10, recipe: "Soak rajma overnight; pressure cook 20 min; simmer in masala" },
      { meal: "2 roti + chana masala + cucumber-onion salad", calories: 460, protein: 19, carbs: 64, fat: 11, recipe: "Soaked chana cooked with onion-tomato masala" },
      { meal: "Vegetable khichdi + kadhi + baked papad", calories: 420, protein: 15, carbs: 60, fat: 10, recipe: "Rice-moong dal cooked soft with veggies; kadhi with besan" },
      { meal: "2 roti + palak paneer (light oil) + salad", calories: 470, protein: 21, carbs: 56, fat: 15, recipe: "Blanched spinach puree with paneer cubes" },
      { meal: "Curd rice + pickle (rinced) + papad", calories: 400, protein: 12, carbs: 62, fat: 9, recipe: "Rice mixed with curd; temper mustard-curry leaves" },
      { meal: "2 jowar roti + dal + lauki sabzi", calories: 430, protein: 16, carbs: 60, fat: 11, recipe: "Jowar flour rotis with simple dal and bottle gourd" },
    ],
    dinner: [
      { meal: "2 missi roti + palak paneer (light oil)", calories: 430, protein: 20, carbs: 48, fat: 16, recipe: "Besan-wheat roti; spinach puree with grilled paneer cubes" },
      { meal: "Moong dal khichdi + sautéed lauki + curd", calories: 380, protein: 16, carbs: 52, fat: 9, recipe: "One-pot moong-dal rice with cumin ghee tadka" },
      { meal: "2 jowar roti + baingan bharta + dal", calories: 410, protein: 15, carbs: 55, fat: 12, recipe: "Roast brinjal; mash with onion-tomato; jowar rotis" },
      { meal: "Paneer-vegetable wrap (1-2) + mint chutney", calories: 400, protein: 18, carbs: 46, fat: 14, recipe: "Whole-wheat wrap with tawa paneer and veggies" },
      { meal: "Vegetable clear soup + 1 multi-grain toast + tofu stir-fry", calories: 370, protein: 18, carbs: 34, fat: 13, recipe: "Simmer veggies; stir-fry tofu with minimal oil" },
      { meal: "2 roti + mixed-veg sabzi + dal", calories: 420, protein: 16, carbs: 58, fat: 11, recipe: "Seasonal vegetables with phulka and thin dal" },
      { meal: "Dalia (broken wheat) vegetable upma + buttermilk", calories: 350, protein: 12, carbs: 52, fat: 8, recipe: "Roast dalia; cook with vegetables" },
    ],
    snacks: [
      { meal: "Roasted chana (30 g) + green tea", calories: 120, protein: 6, carbs: 18, fat: 2, recipe: "Portion out 30 g" },
      { meal: "1 fruit (guava/apple/papaya bowl)", calories: 90, protein: 1, carbs: 22, fat: 0, recipe: "Wash, cut, eat fresh" },
      { meal: "Chaas (buttermilk) with roasted jeera", calories: 60, protein: 3, carbs: 6, fat: 2, recipe: "Blend curd + water + roasted cumin + pinch of salt" },
      { meal: "Almonds + walnuts (20 g)", calories: 130, protein: 5, carbs: 5, fat: 11, recipe: "Soak almonds overnight for easier digestion" },
      { meal: "Sprouts chaat with lemon and onion", calories: 140, protein: 8, carbs: 22, fat: 1, recipe: "Boil sprouted moong; toss with lemon, chaat masala" },
      { meal: "Makhana (fox nuts) roasted, 25 g", calories: 90, protein: 3, carbs: 18, fat: 1, recipe: "Dry-roast with a pinch of salt and pepper" },
      { meal: "Peanut-chikki small piece (20 g)", calories: 100, protein: 3, carbs: 12, fat: 5, recipe: "Prefer jaggery-based, small portion" },
    ],
  },
  "non-vegetarian": {
    breakfast: [
      { meal: "2-egg omelette + 2 brown toast + 1 fruit", calories: 340, protein: 19, carbs: 38, fat: 12, recipe: "Cook on non-stick with minimal oil" },
      { meal: "Egg bhurji + 2 phulka", calories: 360, protein: 19, carbs: 42, fat: 13, recipe: "Scramble eggs with onion-tomato-green chilli" },
      { meal: "Chicken keema paratha (light oil) + curd", calories: 400, protein: 24, carbs: 44, fat: 13, recipe: "Lean mince stuffed in whole-wheat paratha" },
      { meal: "Boiled eggs (2) + poha with peanuts", calories: 350, protein: 16, carbs: 48, fat: 10, recipe: "Classic and quick" },
      { meal: "Grilled chicken (60 g) + oats upma", calories: 380, protein: 26, carbs: 40, fat: 9, recipe: "Marinate chicken overnight; grill 12 min" },
      { meal: "Egg dosa (2) + sambar", calories: 340, protein: 17, carbs: 42, fat: 10, recipe: "Pour beaten egg over dosa while cooking" },
      { meal: "Fish patty (2, baked) + vegetable soup", calories: 320, protein: 22, carbs: 26, fat: 10, recipe: "Minced fish + spices; bake 15 min" },
    ],
    lunch: [
      { meal: "Grilled fish (120 g) + 1 cup rice + sautéed vegetables", calories: 480, protein: 30, carbs: 55, fat: 12, recipe: "Marinate in turmeric-lemon; grill 12 min" },
      { meal: "2 roti + chicken curry (75 g) + salad", calories: 500, protein: 30, carbs: 55, fat: 15, recipe: "Skinless chicken, tomato-based gravy, low oil" },
      { meal: "1.5 cup brown rice + fish moilee + cucumber salad", calories: 490, protein: 28, carbs: 60, fat: 13, recipe: "Fish poached in light onion gravy" },
      { meal: "2 roti + egg curry + salad", calories: 470, protein: 21, carbs: 58, fat: 15, recipe: "2 eggs in light onion-tomato gravy" },
      { meal: "1 cup rice + chicken pulao (75 g chicken) + raita", calories: 510, protein: 27, carbs: 62, fat: 14, recipe: "One-pot pulao with brown rice" },
      { meal: "2 roti + prawn masala (80 g) + dal", calories: 460, protein: 29, carbs: 50, fat: 12, recipe: "Prawns cook in 5 min — garlic-tomato masala" },
      { meal: "Grilled chicken (100 g) + quinoa/rajma salad", calories: 470, protein: 33, carbs: 42, fat: 12, recipe: "Toss grilled strips with rajma and lemon" },
    ],
    dinner: [
      { meal: "Chicken-clear soup + tandoori fish (100 g) + sautéed greens", calories: 380, protein: 32, carbs: 25, fat: 13, recipe: "Marinate fish in hung curd-spices; bake/pan-sear" },
      { meal: "2 roti + mutton curry (60 g, trimmed) + salad", calories: 450, protein: 26, carbs: 48, fat: 16, recipe: "Slow-cook trimmed mutton; skim the fat" },
      { meal: "Egg khichdi + curd", calories: 410, protein: 19, carbs: 54, fat: 11, recipe: "Add whisked egg into moong khichdi at the end" },
      { meal: "2 roti + palak dal + boiled egg", calories: 420, protein: 20, carbs: 52, fat: 12, recipe: "Spinach added to dal tadka" },
      { meal: "Grilled chicken (80 g) + vegetable soup", calories: 350, protein: 30, carbs: 18, fat: 12, recipe: "Herb-marinated; grill 15 min" },
      { meal: "Fish curry (light) + 1 cup red rice", calories: 420, protein: 27, carbs: 45, fat: 12, recipe: "Sardines/mackerel in thin tamarind gravy" },
      { meal: "Chicken tikka (100 g) + sautéed vegetables", calories: 390, protein: 33, carbs: 22, fat: 14, recipe: "Yogurt-spice marinade; oven 20 min" },
    ],
    snacks: [
      { meal: "Chicken soup (homemade, clear)", calories: 110, protein: 12, carbs: 4, fat: 4, recipe: "Simmer chicken with veggies 30 min" },
      { meal: "1 boiled egg + green tea", calories: 90, protein: 7, carbs: 1, fat: 6, recipe: "Keep boiled eggs ready in the fridge" },
      { meal: "1 fruit + green tea", calories: 95, protein: 1, carbs: 22, fat: 0, recipe: "Seasonal fruit" },
      { meal: "Roasted chana (25 g)", calories: 100, protein: 5, carbs: 15, fat: 2, recipe: "Portion-controlled pack" },
      { meal: "Sprouts + boiled egg chaat", calories: 160, protein: 11, carbs: 18, fat: 4, recipe: "Toss with lemon, onion, chaat masala" },
      { meal: "Buttermilk + makhana (20 g)", calories: 110, protein: 5, carbs: 16, fat: 3, recipe: "Light evening combo" },
      { meal: "Fish-amlets (2 mini) + chaas", calories: 140, protein: 12, carbs: 6, fat: 7, recipe: "Small pan-fried fish cakes" },
    ],
  },
};

export const GROCERY_BASE: Record<string, string[]> = {
  "Grains & Pulses": ["Whole-wheat atta", "Brown rice", "Moong dal", "Chana (kabuli)", "Rajma", "Poha/oats", "Jowar/bajra flour"],
  Vegetables: ["Spinach (palak)", "Okra (bhindi)", "Bottle gourd (lauki)", "Brinjal", "Cucumber", "Tomatoes", "Onions", "Lemon"],
  "Dairy & Protein": ["Curd/dahi", "Paneer (200 g)", "Milk (toned)", "Eggs (if non-veg)", "Chicken/fish (if non-veg)"],
  "Spices & Condiments": ["Turmeric", "Cumin", "Coriander powder", "Garam masala", "Mustard/groundnut oil", "Mint + coriander", "Green chilli, ginger, garlic"],
};

/* ---------- ayurveda dosha profiles ---------- */

export interface DoshaProfile {
  bodyType: string;
  digestionType: string;
  traits: string[];
  foods: string[];
  avoid: string[];
  lifestyle: string[];
  dinacharya: string[];
}

export const DOSHA_PROFILES: Record<string, DoshaProfile> = {
  Vata: {
    bodyType: "Typically a light, lean build with a thin frame, dry skin and a tendency to feel cold easily.",
    digestionType: "Variable digestion — sometimes a strong appetite, sometimes skipped; prone to gas and bloating.",
    traits: ["Energetic and creative in bursts", "Quick learner, quick to forget", "Light sleeper with an active mind"],
    foods: [
      "Warm, moist, grounding foods — khichdi, moong dal soup, ghee",
      "Cooked root vegetables (sweet potato, carrot)",
      "Warm milk with a pinch of nutmeg at night",
      "Soaked almonds, dates, sesame",
    ],
    avoid: ["Excess raw salads and cold drinks", "Dry snacks (biscuits, chips)", "Coffee on an empty stomach", "Skipping meals"],
    lifestyle: ["Fixed daily routine — Vata thrives on regularity", "Daily warm-oil self-massage (abhyanga)", "Gentle yoga — forward folds, slow flows"],
    dinacharya: ["Wake by 6 am", "Warm sesame-oil massage before bath", "Warm cooked breakfast", "Early, light dinner by 7:30 pm", "Oil pulling in the morning"],
  },
  Pitta: {
    bodyType: "Medium, athletic build with warm skin, sharp features and a tendency to sweat easily.",
    digestionType: "Strong, sharp digestion — gets irritable if meals are late; prone to acidity.",
    traits: ["Focused and goal-driven", "Sharp intellect and speech", "Impatient under stress"],
    foods: [
      "Cooling foods — coconut water, cucumber, sweet fruits, coriander",
      "Ghee, milk, basmati rice, moong dal",
      "Bitter greens (methi, karela in moderation)",
      "Fennel tea after meals",
    ],
    avoid: ["Chilli-heavy, fermented and fried food", "Alcohol and excess salt", "Skipping meals (spikes acidity)", "Excess sour food"],
    lifestyle: ["Avoid midday sun and overworking", "Cooling yoga — moon salutations, sheetali pranayama", "Time in nature and by water"],
    dinacharya: ["Wake before sunrise", "Cooling rose-water face rinse", "Largest meal at midday", "Evening walk", "Sheetali pranayama"],
  },
  Kapha: {
    bodyType: "Solid, sturdy build with smooth, moist skin; gains weight easily and has good stamina.",
    digestionType: "Slow but steady digestion; sluggish metabolism, heavy feeling after overeating.",
    traits: ["Calm, patient and loyal", "Deep, long sleep", "Prefers comfort and routine"],
    foods: [
      "Light, warm, spiced food — millet roti, barley, moong",
      "Ginger, black pepper, turmeric, trikatu",
      "Steamed vegetables and soups",
      "Honey-water (warm, never hot) in the morning",
    ],
    avoid: ["Heavy dairy, excess ghee and sweets", "Cold/frozen food and drinks", "Daytime sleeping", "Fried and oily food"],
    lifestyle: ["Vigorous daily exercise — the Kapha essential", "Dry massage (udvartana) with herbal powder", "Variety and stimulation to beat inertia"],
    dinacharya: ["Wake by 5:30 am (before Kapha heaviness sets in)", "Tongue scraping + trikatu with warm water", "Most vigorous activity in the morning", "Light dinner, no late snacking", "Bhastrika pranayama"],
  },
};

/* ---------- women's care keyword map ---------- */

export const WOMENS_CONCERN_MAP: {
  re: RegExp;
  assessment: string;
  conditions: { name: string; note: string }[];
  recommendations: string[];
  lifestyle: string[];
  pcosSignal: number;
}[] = [
  {
    re: /pcos|pcod|cyst.*ovar|hirsutism|facial hair/,
    assessment: "Irregular cycles with acne, weight gain or excess hair growth are the classic PCOS pattern — very common in Indian women (about 1 in 5) and very manageable with early lifestyle care.",
    conditions: [
      { name: "Polycystic Ovary Syndrome (PCOS)", note: "Matches the irregular-periods + hormonal-symptoms pattern" },
      { name: "Thyroid imbalance", note: "Can mimic PCOS — a TSH test distinguishes them" },
      { name: "Insulin resistance", note: "Usually present alongside PCOS; drives weight and skin changes" },
    ],
    recommendations: [
      "Get tested: pelvic ultrasound, TSH, fasting insulin + sugar, lipid profile",
      "45 min brisk exercise 5 days/week — the single most effective PCOS intervention",
      "Reduce refined carbs (maida, sugar) — prefer millets, whole grains, dal-first eating",
      "Track your cycle monthly with an app or calendar",
    ],
    lifestyle: ["Protein at every meal", "Strength training 2x/week alongside cardio", "7-8 hours sleep — poor sleep worsens insulin resistance"],
    pcosSignal: 70,
  },
  {
    re: /irregular|missed period|delay.*period|period.*late/,
    assessment: "Occasionally delayed periods are common with stress, travel, weight changes or seasonal illness; repeatedly irregular cycles (3+ months) deserve a hormonal workup.",
    conditions: [
      { name: "Stress or lifestyle-related cycle shift", note: "Recent stress, sleep loss or weight change commonly delays ovulation" },
      { name: "PCOS / hormonal imbalance", note: "Recurrent irregularity is the leading cause in Indian women" },
      { name: "Thyroid disorder", note: "Both over- and under-active thyroid disturb cycles" },
    ],
    recommendations: [
      "Rule out pregnancy first if sexually active (home urine test)",
      "If irregular 3+ cycles: TSH, prolactin, HbA1c + pelvic ultrasound",
      "Keep steady sleep and balanced meals — sudden dieting disrupts cycles",
    ],
    lifestyle: ["Iron-rich diet (greens, dates, sesame)", "Gentle yoga during the cycle", "Avoid crash diets"],
    pcosSignal: 40,
  },
  {
    re: /pregnan|conceiv|fertility|ovulation|trying for/,
    assessment: "Preconception care makes a measurable difference: folic acid 3 months before conception, cycle tracking and basic health screening improve outcomes.",
    conditions: [
      { name: "Normal cycle variability", note: "Conception can take up to 12 months in healthy couples under 35" },
      { name: "Ovulation timing uncertainty", note: "Mid-cycle tracking (day 10-16) or LH kits help time attempts" },
    ],
    recommendations: [
      "Start folic acid 400 µg daily (consult your gynaecologist)",
      "Track cycles: ovulation is ~14 days before the next period",
      "Screen both partners: blood group, Hb, thyroid, sugar, rubella immunity",
      "No alcohol/smoking; limit caffeine to 1-2 cups daily",
    ],
    lifestyle: ["Moderate daily walking", "Colourful, varied diet", "Manage stress — it affects ovulation"],
    pcosSignal: 10,
  },
  {
    re: /cramp|pain.*period|dysmenorrhea|heavy period|menorrhagia/,
    assessment: "Period pain is usually primary (muscle cramping, common in the first 1-2 days) and responds well to heat, movement and simple painkillers; pain that stops you working, or heavy flooding bleeding, needs an evaluation.",
    conditions: [
      { name: "Primary dysmenorrhea", note: "Common cramping without underlying disease" },
      { name: "Endometriosis / fibroids", note: "Consider if pain is severe, progressively worsening, or with heavy clots" },
    ],
    recommendations: [
      "Heat pad on the lower abdomen + gentle stretching",
      "Paracetamol or mefenamic acid at the first cramp sign (as per label)",
      "If bleeding soaks a pad every 1-2 hours, get Hb + ultrasound",
    ],
    lifestyle: ["Warm compresses", "Light exercise mid-cycle reduces next-cycle pain", "Adequate hydration and magnesium-rich foods (bananas, nuts)"],
    pcosSignal: 15,
  },
];
