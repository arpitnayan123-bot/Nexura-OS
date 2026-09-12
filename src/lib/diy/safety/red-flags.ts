/* ============================================================
 * NEXURA DIY — RED-FLAG REGISTRY (deterministic, offline)
 * Patterns beat models: anything matched here never reaches an
 * LLM. Includes romanized-Hindi emergency phrasing (word-order
 * tolerant) — "mere chest mein bahut dard" MUST trip EMERGENCY.
 * ============================================================ */

export type RedFlagKind =
  | "emergency_cardiac"
  | "emergency_respiratory"
  | "emergency_neuro"
  | "emergency_toxic"
  | "emergency_bleeding"
  | "emergency_trauma"
  | "emergency_obstetric"
  | "emergency_metabolic"
  | "ed_signature"
  | "controlled_med"
  | "chronic_condition"
  | "vulnerable_pregnancy"
  | "vulnerable_minor";

export interface RedFlag {
  id: string;
  kind: RedFlagKind;
  severity: "blocker" | "major" | "flag";
  /** action the engine must take */
  action: "EMERGENCY" | "STOP_AND_REFER" | "SOFT_LIMIT" | "CLARIFY";
  pattern: RegExp;
  message: string;
}

const E = (id: string, kind: RedFlagKind, pattern: RegExp, message: string): RedFlag => ({
  id, kind, severity: "blocker", action: "EMERGENCY", pattern, message,
});
const R = (id: string, kind: RedFlagKind, pattern: RegExp, message: string): RedFlag => ({
  id, kind, severity: "major", action: "STOP_AND_REFER", pattern, message,
});
const F = (id: string, kind: RedFlagKind, pattern: RegExp, message: string): RedFlag => ({
  id, kind, severity: "flag", action: "SOFT_LIMIT", pattern, message,
});

export const RED_FLAGS: RedFlag[] = [
  /* ---------- EMERGENCY — cardiac (EN + hinglish, word-order tolerant) ---------- */
  E("cardiac_pain", "emergency_cardiac", /(?:chest|seene?|seenay|dil|heart)\s+(?:me[i6]?n?\s+)?(?:bahut|bohot|bhot|severe|badh|teZ|crushing|heavy)?\s*(?:dard|pain|pressure|joro?r)?\s*(?:dard|pain|pressure)|(?:bahut|severe|crushing)\s+(?:chest|seene?|heart)\s*(?:dard|pain)|(?:pain|pressure|dard|joro?r)\s*(?:hai\s+)?(?:in|me[i6]?n?|ke\s+dauran)\s+(?:my\s+|mere\s+|meri\s+)?(?:chest|seene?|seenay|chhati|heart|dil)|heart\s*attack|dil\s+ka\s+(?:daura|dor)/i, "Chest pain can be an emergency. Please call 112 or 108 right now — do not wait."),
  E("cardiac_sweat", "emergency_cardiac", /(?:chest|seene?)\s*(?:dard|pain)[^.]{0,40}(?:pasina|sweat|breath|saans)|(?:pasina|sweating)[^.]{0,30}(?:chest|seene?)\s*(?:dard|pain)/i, "Chest pain with sweating or breathlessness needs emergency care now — call 108."),
  /* ---------- EMERGENCY — respiratory ---------- */
  E("breath_severe", "emergency_respiratory", /(?:saans|saanso?|breath(?:ing)?)\s*(?:phool|phul|fooled|na\s+aane|nahi\s+aa|heavy|bahut\s+takleef)|can(?:no)?['’ ]?t\s+breathe|cannot\s+breathe|severe\s+(?:breathlessness|shortness\s+of\s+breath)|choking/i, "Breathing difficulty is an emergency — call 108 immediately."),
  /* ---------- EMERGENCY — neuro ---------- */
  E("stroke_sudden", "emergency_neuro", /(?:lakwa|paralysis|face\s+droop|slurred\s+speech|baherpan|sudden\s+(?:weakness|numbness)\s+(?:one\s+side|ek\s+taraf))/i, "These can be stroke signs — every minute counts. Call 112 now."),
  E("seizure", "emergency_neuro", /(?:seizure|fit(?:s)?\s+(?:aaye|pad|fell)|miragi\s+ka\s+daura|unconscious|behosh|passed\s+out)/i, "Seizure or unconsciousness needs emergency care — call 112."),
  /* ---------- EMERGENCY — toxic / poisoning ---------- */
  E("poison", "emergency_toxic", /(?:zeher|poison|poisoned|kh gaya|kha liya)[^.]{0,30}(?:goli|tablet|chemical|acid|naphthalene)|overdose|(?:goli|tablets?)\s+kha\s+liya\s+(?:zyada|bahut)/i, "Possible poisoning is an emergency — call 112 or go to the nearest hospital NOW."),
  /* ---------- EMERGENCY — bleeding / trauma ---------- */
  E("bleeding", "emergency_bleeding", /(?:khoon\s+beh|bleeding\s+(?:heavily|won'?t\s+stop)|bahut\s+khoon|vomiting\s+blood|khooni\s+ulti)/i, "Heavy bleeding is an emergency — call 108 or reach the nearest hospital now."),
  E("trauma", "emergency_trauma", /(?:accident\s+ho\s+gay|road\s+accident|fell\s+from\s+height|geera\s+hai|deep\s+wound|fracture\s+ho\s+gay)/i, "Injury after an accident needs emergency assessment — call 108."),
  /* ---------- EMERGENCY — obstetric ---------- */
  E("pregnancy_bleed", "emergency_obstetric", /(?:pregnan|garbhavastha|garbhwati)[^.]{0,40}(?:khoon|bleeding|dard|pain)|(?:khoon|bleeding)[^.]{0,40}(?:pregnan|garbh)/i, "Bleeding or pain in pregnancy is an emergency — call 108 immediately."),
  /* ---------- EMERGENCY — metabolic ---------- */
  E("sugar_emergency", "emergency_metabolic", /(?:sugar\s+(?:bahut|very)?\s*(?:high|low|kam|zyada)[^.]{0,30}(?:behosh|unconscious|fit))|(?:diabetic\s+(?:emergency|coma))/i, "Sugar emergencies can turn dangerous fast — call 108 now."),

  /* ---------- STOP_AND_REFER — eating-disorder signatures (protect, never coach) ---------- */
  R("ed_starve", "ed_signature", /(?:stop\s+eating|not\s+eating\s+(?:at\s+all|for\s+days)|skip\s+(?:all|every)\s+meals|bhukha\s+rehna\s+hai|khana\s+band)/i, "Restricting food this way can seriously harm you. Please talk to a doctor or a counselor — I am not able to coach this."),
  R("ed_purge", "ed_signature", /(?:make\s+myself\s+(?:vomit|throw\s+up)|vomit\s+after\s+eating|ulti\s+karna\s+hai\s+khake|laxative|pet\s+saaf\s+goli)/i, "What you are describing is a medical condition that deserves real care, not a plan. Please reach a doctor or helpline (iCall 9152987821)."),
  R("ed_bodycheck", "ed_signature", /(?:hate\s+my\s+body|feel\s+disgusting|phatte\s+hue|moti\s+lagti\s+hun|kuchh\s+nahi\s+khata)/i, "How you are feeling about your body matters. A professional can help far more than any plan — consider iCall 9152987821."),
  R("ed_extreme_fast", "ed_signature", /(?:water\s+fast|fast\s+for\s+\d+\s+days|\b\d+\s+days?\s+(?:fast|no\s+food)|sirf\s+paani)/i, "Multi-day fasting is not something I will plan. A doctor or dietitian can help you safely."),

  /* ---------- STOP_AND_REFER — controlled / prescription meds ---------- */
  R("med_rx", "controlled_med", /(?:steroids?|sarms?|winstrol|anavar|clenbuterol|testosterone\s+(?:injection|cycle)|injection\s+lagwa|weight\s+loss\s+(?:pills?|medicine)|slimming\s+pills?|viagra|modafinil|adderal)/i, "Prescription medicines and injections need a real doctor who can see you. I do not plan or recommend these."),

  /* ---------- SOFT_LIMIT — chronic conditions need clinical care alongside ---------- */
  F("cc_diabetes", "chronic_condition", /\b(?:diabetes|sugar\s+ki\s+bimari|hba1c|insulin)\b/i, "Diabetes changes what is safe to do alone — please keep your doctor in the loop alongside any plan."),
  F("cc_bp", "chronic_condition", /\b(?:blood\s+pressure|\bbp\b|hypertension|dil\s+ki\s+bimari|heart\s+disease)\b/i, "Heart or blood-pressure conditions deserve supervision — involve your doctor in this journey."),
  F("cc_thyroid", "chronic_condition", /\b(?:thyroid|hypothyroid|hyperthyroid)\b/i, "Thyroid affects energy and weight — get your levels checked and keep your doctor informed."),
  F("cc_pcod", "chronic_condition", /\b(?:pcos|pcod)\b/i, "PCOS/PCOD responds best with a doctor-guided plan — please keep one involved."),
  F("cc_kidney", "chronic_condition", /\b(?:kidney|gurde|dialysis|creatinine)\b/i, "Kidney conditions make many diet changes risky — only proceed with your nephrologist's guidance."),
  F("cc_liver", "chronic_condition", /\b(?:liver|jigar|hepatitis|fatty\s+liver)\b/i, "Liver conditions need clinical oversight — please consult your doctor for this goal."),
  F("cc_asthma", "chronic_condition", /\b(?:asthma|dama|inhaler)\b/i, "Asthma needs an exercise plan your doctor approves — check with them first."),
  F("cc_epilepsy", "chronic_condition", /\b(?:epilepsy|miragi)\b/i, "Epilepsy calls for clinician-guided activity choices — loop your doctor in."),
  F("cc_cancer", "chronic_condition", /\b(?:cancer|kemotherapy|chemo|tumor|cancer\s+ka)\b/i, "During or after cancer care, only your oncology team should guide lifestyle changes."),
  F("cc_mental", "chronic_condition", /\b(?:depression|suicidal|self\s*harm|kudkhushi|marna\s+chahta|antidepressant)\b/i, "What you are carrying sounds heavy. Please reach a professional — Tele-MANAS 14416 (24x7, free). I can support everyday habits, not treat this."),
  F("cc_gut", "chronic_condition", /\b(?:stomach\s+ulcer|ulcer|gastritis|appendix)\b/i, "These gut symptoms need a doctor's eyes first — please consult before diet changes."),
  F("cc_joint", "chronic_condition", /\b(?:arthritis|slip\s+disc|sciatica|hernia)\b/i, "Joint and spine conditions need tailored guidance — a doctor or physiotherapist should approve the plan."),
  F("cc_tb", "chronic_condition", /\b(?:tuberculosis|\btb\b|kshay rog)\b/i, "TB treatment must lead; nutrition supports it — stay under your doctor's care."),
  F("cc_preg_active", "chronic_condition", /\b(?:pregnant|garbhavastha|garbhawati|expecting)\b/i, "Congratulations — and caution: pregnancy changes every recommendation. Please run this goal by your obstetrician."),
  F("cc_recent_surgery", "chronic_condition", /\b(?:surgery\s+(?:hui|thi|after|post)|operation\s+ke\s+baad|post\s*-?surgery)\b/i, "After surgery, movement and diet need your surgeon's clearance first."),
  F("cc_dizzy", "chronic_condition", /(?:chakkar\s+(?:aate|aata)|dizzy\s+(?:all|most)|faint\s+recently|bahut\s+chakkar)/i, "Frequent dizziness should be checked by a doctor before any fitness plan."),

  /* ---------- CLARIFY — vulnerable contexts ---------- */
  F("v_minor", "vulnerable_minor", /\b(?:i\s+am\s+(?:1[0-7]|[1-9])\s*years?\s*old|i[' ]?m\s+(?:1[0-7]|[1-9])\b|16\s+saal|17\s+saal)\b/i, "For users under 18, plans need a parent or guardian involved — Nexura DIY is built for adults."),
  F("v_pregnant", "vulnerable_pregnancy", /\b(?:pregnant\s+hoon|garbhavati\s+hoon|i\s+am\s+pregnant)\b/i, "Pregnancy needs obstetrician-guided plans — I will keep this goal gentle and flag it for clinical review."),
];

/** 12 romanized-Hindi EMERGENCY patterns, word-order tolerant.
 *  Shipped as a separate list so tests can assert each one. */
export const HINGLISH_EMERGENCIES: { id: string; pattern: RegExp; message: string }[] = [
  { id: "hi_chest_1", pattern: /(?:mere|mera|meri)?\s*(?:chest|seene?|chhati)\s*(?:me[i6]?n?|me)?\s*(?:bahut|bohot|bhot|zyada)?\s*(?:dard|pain)/i, message: "Call 112 / 108 now — chest pain can be an emergency." },
  { id: "hi_chest_2", pattern: /(?:dard|pain)\s+(?:hai\s+)?(?:mere\s+)?(?:chest|seene?|chhati)\s*(?:me[i6]?n?)?/i, message: "Call 112 / 108 now — chest pain can be an emergency." },
  { id: "hi_heart_attack", pattern: /(?:heart\s*attack|dil\s+ka\s+daura|dil\s+ka\s+dora|heart\s+ka\s+attack)/i, message: "Heart-attack signs — call 108 immediately." },
  { id: "hi_breath", pattern: /(?:saans|saanso?n?)\s*(?:phool|phul|nahi\s+aa|na\s+aa)\s*(?:rahe?|rahi)?/i, message: "Breathlessness is an emergency — call 108." },
  { id: "hi_lakwa", pattern: /(?:lakwa|lakwa\s+pad|chehra\s+tedha|mu\s+tedha|haath\s+mei?\s+kamzori\s+ekdam)/i, message: "Stroke signs — call 112 now, every minute counts." },
  { id: "hi_poison", pattern: /(?:zeher|jehar|zahar)\s*(?:kha|pi|gaya|liya|kha\s+liya|pi\s+liya)?/i, message: "Poisoning is an emergency — call 112 now." },
  { id: "hi_bleeding", pattern: /(?:khoon\s+beh\s+(?:raha|rahi)|bahut\s+khoon\s+nikal)/i, message: "Heavy bleeding — call 108 or reach a hospital now." },
  { id: "hi_accident", pattern: /(?:accident\s+ho\s+gay[ai]?|accident\s+mei?\s+(?:lag|geera))/i, message: "Accident injuries need emergency care — call 108." },
  { id: "hi_preg_bleed", pattern: /(?:pregnan(?:cy|t)?|garbhavati|garbh)\s*(?:mei?n?\s*)?(?:khoon|bleeding|dard)/i, message: "Bleeding in pregnancy is an emergency — call 108." },
  { id: "hi_severe_abd", pattern: /(?:pet\s*(?:mei?n?)?\s*(?:bahut|severe|teZ)?\s*dard|sar\s*(?:mei?n?)?\s*(?:bahut|severe)?\s*dard\s*(?:se|bhi)?)/i, message: "Severe pain needs urgent medical assessment — please seek care now." },
  { id: "hi_unconscious", pattern: /(?:behosh\s*(?:ho\s+gaya?|hai|pade?|hain)|hosh\s+nahi)/i, message: "Unconsciousness is an emergency — call 112 immediately." },
  { id: "hi_seizure", pattern: /(?:fit\s+(?:aaya|aaye|pad[ae]?)|daura\s+(?:pad[ae]?|aaya))/i, message: "Seizure — call 112 and keep the person safe on their side." },
];
