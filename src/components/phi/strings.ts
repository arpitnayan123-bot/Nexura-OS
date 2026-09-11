/* ============================================================
 * PHI — UI strings (EN default + HI override dictionary)
 * Flat keys so the HI layer can safely fall back to EN.
 * Language choice is stored in localStorage under "phi_lang".
 * SAFETY: never use the words "diagnos-", "disease probability",
 * or percentage risk figures in any user-facing string here.
 * ============================================================ */

export type PhiLang = "en" | "hi";

export const PHI_LANG_KEY = "phi_lang";

export function readStoredLang(): PhiLang {
  if (typeof window === "undefined") return "en";
  try {
    const v = window.localStorage.getItem(PHI_LANG_KEY);
    return v === "hi" ? "hi" : "en";
  } catch {
    return "en";
  }
}

export function writeStoredLang(lang: PhiLang): void {
  try {
    window.localStorage.setItem(PHI_LANG_KEY, lang);
  } catch {
    /* private mode — language simply won't persist */
  }
}

/* ----------------------------- EN ----------------------------- */

export const EN: Record<string, string> = {
  /* Landing */
  "landing.eyebrow": "NEXURA PREDICTIVE HEALTH INTELLIGENCE",
  "landing.h1a": "Healthcare is Reactive.",
  "landing.h1b": "Nexura is Predictive.",
  "landing.sub":
    "Spot important health signals earlier, understand what may be contributing to them, and know what to do next.",
  "landing.ctaPrimary": "Check My Health Signals",
  "landing.ctaSecondary": "How It Works",
  "landing.demoBadge": "DEMO — not clinically validated. Always consult a doctor.",
  "landing.trustRow":
    "Your answers stay private · Consent-based · Delete anytime",
  "landing.howTitle": "How it works",
  "landing.how1t": "You share what's going on",
  "landing.how1d":
    "A short, guided check-in — symptoms, history, lifestyle and vitals. Skip anything you'd rather not share.",
  "landing.how2t": "Safety checks run first — always",
  "landing.how2d":
    "Emergency screening happens before any other analysis. If something needs urgent care, that information comes first.",
  "landing.how3t": "You get signals, context, and clear next steps, plus a summary you can take to a doctor",
  "landing.how3d":
    "Every signal explains what Nexura noticed, what is unknown, and what could clarify it. No jargon, no blame.",
  "landing.safetyTitle": "How safety works",
  "landing.safetyBody":
    "Emergency checks run before any analysis. Missing information is shown honestly. Every result records its engine and ruleset versions.",
  "landing.continueTitle": "Continue where you left off",
  "landing.continueDesc": "You have saved assessments and health information from earlier visits.",
  "landing.continueCta": "View past assessments",
  "landing.backToSite": "Return to Hospital OS",

  /* Global chrome */
  "app.loading": "Loading your secure session…",
  "app.errorTitle": "Something interrupted us",
  "app.errorBody": "We couldn't reach the health service. Nothing was lost.",
  "app.retry": "Try again",
  "app.langLabel": "Language",
  "app.langEn": "English",
  "app.langHi": "हिंदी",
  "app.settings": "Settings",
  "app.history": "My history",
  "app.home": "Overview",
  "app.back": "Back",
  "app.close": "Close",
  "app.saved": "Saved",
  "app.notSaved": "Not saved — Retry",
  "app.saving": "Saving…",
  "app.optional": "Optional",
  "app.whyWeAsk": "Why we ask",
  "app.skipStep": "Skip this step (optional)",
  "app.continue": "Continue",
  "app.demoTag": "DEMO",
  "app.killSwitchTitle": "Health checks are temporarily paused",
  "app.killSwitchBody":
    "Nexura has paused new assessments for a routine review. Your saved information is safe. Please check back a little later.",

  /* Consent scopes (plain-language one-liners) */
  "consent.scope.health_profile":
    "Your basic health details (age, sex, height, weight) used to personalize safety checks.",
  "consent.scope.assessment": "Run safety checks and health-signal analysis on what you share.",
  "consent.scope.trends": "Look at how your vitals and habits change over time.",
  "consent.scope.ai_processing":
    "Let Nexura's AI rephrase engine findings into simpler language for you.",
  "consent.scope.clinician_sharing":
    "Create summaries and time-limited links you can share with a doctor.",
  "consent.scope.notifications": "Gentle reminders about check-ins and follow-ups.",
  "consent.scope.connected_devices": "Read data from health devices you choose to connect.",
  "consent.scope.record_import": "Import past reports or lab results you choose to upload.",
  "consent.scope.research":
    "Use de-identified information to improve health research. Entirely optional.",
  "consent.scope.care_navigation": "Help you reach the right doctor or service when you need one.",

  /* Intake — consent step */
  "consent.title": "Your choices, first",
  "consent.intro":
    "Nexura only looks at what you allow. You can change any of these later in Settings, and you can delete everything anytime.",
  "consent.turnOnAll": "Allow all",
  "consent.turnOffAll": "Clear all",
  "consent.blockedNote":
    "Allow Health profile and Assessment to continue — checks can't run without them.",
  "consent.requiredNote":
    "Health profile and Assessment are needed for checks to run. Turning either off pauses assessments.",

  /* Intake step names (progress bar) */
  "step.consent": "Consent",
  "step.profile": "About you",
  "step.symptoms": "Symptoms",
  "step.conditions": "History",
  "step.lifestyle": "Lifestyle",
  "step.vitals": "Vitals",
  "step.review": "Review",

  /* Intake — profile step */
  "profile.title": "About you",
  "profile.intro": "A few basics so safety checks can be tuned to you.",
  "profile.age": "Age (years)",
  "profile.ageWhy": "Safety thresholds differ by age — this keeps checks honest for you.",
  "profile.sex": "Sex at birth",
  "profile.sexWhy": "Used only where it changes a safety threshold or question.",
  "profile.pregnancy": "Possibility of pregnancy",
  "profile.pregnancyWhy": "Pregnancy changes which checks and advice are safe.",
  "profile.height": "Height (cm)",
  "profile.weight": "Weight (kg)",
  "profile.waist": "Waist (cm)",
  "profile.waistWhy": "Waist size is a useful cardiometabolic signal on its own.",
  "profile.language": "Preferred language for results",
  "profile.activityLevel": "Typical activity level",
  "profile.occupation": "Occupation type",
  "profile.shiftWork": "I work night or rotating shifts",
  "profile.shiftWorkWhy": "Shift work affects sleep and metabolic patterns.",
  "profile.accessibility": "Anything we should make easier for you?",
  "profile.accessibilityWhy":
    "For example: screen-reader use, memory difficulties, or prefers short sentences.",
  "profile.adultsOnly":
    "This version of Nexura Predictive is designed for adults 18 and over. For children and teens, please consult a pediatrician.",
  "profile.ageRequired": "Please enter your age to continue.",
  "profile.sex.male": "Male",
  "profile.sex.female": "Female",
  "profile.sex.intersex": "Intersex",
  "profile.sex.undisclosed": "Prefer not to say",
  "profile.activity.low": "Mostly seated",
  "profile.activity.moderate": "Some movement most days",
  "profile.activity.high": "Active or physical work",

  /* Intake — symptoms step */
  "symptoms.title": "What's been going on?",
  "symptoms.intro": "Describe what you've noticed. Plain words are perfect.",
  "symptoms.category": "What best describes it?",
  "symptoms.severity": "How strong is it right now? ({n}/10)",
  "symptoms.severityMild": "Mild",
  "symptoms.severityNoticeable": "Noticeable",
  "symptoms.severitySevere": "Severe",
  "symptoms.onset": "When did it start?",
  "symptoms.onset.today": "Today",
  "symptoms.onset.fewDays": "A few days ago",
  "symptoms.onset.overWeek": "Over a week ago",
  "symptoms.onset.overMonth": "Over a month ago",
  "symptoms.isNew": "Is this new for you?",
  "symptoms.isWorsening": "Is it getting worse?",
  "symptoms.associated": "Anything else you notice alongside it?",
  "symptoms.associatedAdd": "Add",
  "symptoms.associatedPlaceholder": "e.g. nausea, light sensitivity…",
  "symptoms.freeText": "In your words",
  "symptoms.freeTextPlaceholder": "Describe it the way you'd tell a doctor…",
  "symptoms.hinglishNote":
    "Hinglish is welcome — write the way you'd actually say it (e.g. \"subah se sar bhari lag raha hai\").",
  "symptoms.mentalHealthNotice":
    "You don't have to carry this alone, and support is available right now. Tele-MANAS: 14416 (free, 24×7, all languages). If you are in immediate danger, call 108.",
  "symptoms.mentalHealthNoticeContinue": "You can continue — your answer will still be saved.",
  "symptoms.addAnother": "Add another symptom",
  "symptoms.remove": "Remove",
  "symptoms.emptyHint": "You can skip this step if nothing is bothering you right now.",
  "symptoms.cat.general": "General / not sure",
  "symptoms.cat.fever": "Fever",
  "symptoms.cat.headache": "Headache",
  "symptoms.cat.chest_pain": "Chest pain / pressure",
  "symptoms.cat.breathing": "Breathing difficulty",
  "symptoms.cat.abdominal_pain": "Stomach / abdominal pain",
  "symptoms.cat.neurological": "Neurological (numbness, weakness, fainting, speech)",
  "symptoms.cat.bleeding": "Bleeding",
  "symptoms.cat.allergic_reaction": "Allergic reaction",
  "symptoms.cat.dehydration": "Dehydration",
  "symptoms.cat.vomiting": "Vomiting / loose motions",
  "symptoms.cat.mental_health": "Mental health",
  "symptoms.cat.self_harm": "Thoughts of self-harm",

  /* Intake — conditions / medications / allergies step */
  "conditions.title": "Health history",
  "conditions.intro":
    "Long-standing conditions, regular medicines, and allergies make safety checks far more accurate.",
  "conditions.list": "Known conditions",
  "conditions.name": "Condition",
  "conditions.status": "Status",
  "conditions.status.active": "Active",
  "conditions.status.managed": "Managed with treatment",
  "conditions.status.resolved": "Resolved",
  "conditions.medications": "Regular medications",
  "conditions.medName": "Medicine",
  "conditions.medStrength": "Strength (e.g. 500 mg)",
  "conditions.medFrequency": "How often",
  "conditions.allergies": "Allergies",
  "conditions.allergySubstance": "Allergic to",
  "conditions.allergyReaction": "Reaction",
  "conditions.addItem": "Add",
  "conditions.removeItem": "Remove",

  /* Intake — lifestyle step */
  "lifestyle.title": "Daily life",
  "lifestyle.intro":
    "Everyday routine shapes most health signals. Answer loosely — approximate is fine.",
  "lifestyle.diet": "Dietary preference",
  "lifestyle.diet.vegetarian": "Vegetarian",
  "lifestyle.diet.non_vegetarian": "Non-vegetarian",
  "lifestyle.diet.eggetarian": "Eggetarian",
  "lifestyle.diet.vegan": "Vegan",
  "lifestyle.diet.jain": "Jain",
  "lifestyle.diet.other": "Other",
  "lifestyle.cuisine": "Regional cuisine you eat most",
  "lifestyle.cuisine.north_indian": "North Indian",
  "lifestyle.cuisine.south_indian": "South Indian",
  "lifestyle.cuisine.east_indian": "East Indian",
  "lifestyle.cuisine.west_indian": "West Indian",
  "lifestyle.cuisine.northeast_indian": "North-East Indian",
  "lifestyle.cuisine.mixed": "Mixed",
  "lifestyle.sleep": "Sleep, most nights (hours)",
  "lifestyle.sleepWhy": "Sleep duration shapes energy, BP and sugar signals.",
  "lifestyle.sleepQuality": "Sleep quality, most nights",
  "lifestyle.sleepQuality.good": "Restful",
  "lifestyle.sleepQuality.fair": "About average",
  "lifestyle.sleepQuality.poor": "Restless / broken",
  "lifestyle.activity": "Brisk activity per week (minutes)",
  "lifestyle.activityWhy": "Any movement counts — walking to the bus stop included.",
  "lifestyle.fruitsVeg": "Fruits and vegetables",
  "lifestyle.fruitsVeg.rarely": "Rarely",
  "lifestyle.fruitsVeg.sometimes": "Some days",
  "lifestyle.fruitsVeg.daily": "Once a day",
  "lifestyle.fruitsVeg.most_meals": "Most meals",
  "lifestyle.tobacco": "Tobacco (any form)",
  "lifestyle.tobacco.never": "Never",
  "lifestyle.tobacco.former": "Used to, stopped",
  "lifestyle.tobacco.current": "Yes, currently",
  "lifestyle.alcohol": "Alcohol",
  "lifestyle.alcohol.never": "Never",
  "lifestyle.alcohol.occasional": "Occasionally",
  "lifestyle.alcohol.weekly": "Weekly",
  "lifestyle.alcohol.daily": "Daily",
  "lifestyle.stress": "Stress, these past weeks",
  "lifestyle.stress.low": "Mostly calm",
  "lifestyle.stress.moderate": "Manageable",
  "lifestyle.stress.high": "High",
  "lifestyle.water": "Glasses of water a day",

  /* Intake — vitals step */
  "vitals.title": "Recent readings",
  "vitals.intro":
    "If you have a home BP monitor or glucometer, recent numbers help a lot. Unsure? Skip or mark them unsure.",
  "vitals.bp": "Blood pressure",
  "vitals.bpHint": "Format 120/80 — top number first",
  "vitals.bpWhy": "BP is one of the strongest early signals we check.",
  "vitals.pulse": "Pulse (beats/min)",
  "vitals.temperature": "Temperature",
  "vitals.tempUnit": "Unit",
  "vitals.spo2": "Oxygen level (SpO₂ %)",
  "vitals.glucose": "Blood sugar",
  "vitals.glucoseUnit": "Unit",
  "vitals.glucoseHint": "Fasting or random — you can note which in your own words in Symptoms.",
  "vitals.weight": "Weight (kg)",
  "vitals.atRest": "I was sitting at rest for a few minutes before measuring",
  "vitals.atRestWhy": "Walking or climbing just before measuring can mislead the numbers.",
  "vitals.confidence": "How sure are you of these readings?",
  "vitals.confidence.sure": "Measured myself, sure",
  "vitals.confidence.unsure": "Roughly remembered",
  "vitals.tempC": "°C",
  "vitals.tempF": "°F",

  /* Intake — review step */
  "review.title": "Review before we run your checks",
  "review.intro": "Nothing is analyzed until you press the button. Edit anything below.",
  "review.edit": "Edit",
  "review.run": "Run My Assessment",
  "review.runWhy": "Safety checks run first, always.",
  "review.section.profile": "About you",
  "review.section.symptoms": "Symptoms",
  "review.section.conditions": "History, medications & allergies",
  "review.section.lifestyle": "Daily life",
  "review.section.vitals": "Recent readings",
  "review.noneRecorded": "Nothing recorded (skipped)",

  /* Running */
  "running.title": "Running your checks",
  "running.s1": "Safety checks first…",
  "running.s2": "Reviewing your information…",
  "running.s3": "Preparing your signals…",
  "running.note": "This takes a few seconds. We never rush safety.",

  /* Results */
  "results.urgency.EMERGENCY_NOW": "Emergency — act now",
  "results.urgency.SAME_DAY_MEDICAL_REVIEW": "See a doctor today",
  "results.urgency.PROMPT_APPOINTMENT": "Book an appointment soon",
  "results.urgency.ROUTINE_FOLLOW_UP": "Routine follow-up",
  "results.urgency.MONITOR_AND_PREVENT": "Keep monitoring",
  "results.safetyBannerTitle": "Please read this first",
  "results.call108": "Call 108",
  "results.call14416": "Call Tele-MANAS 14416",
  "results.whyUnsafeLabel": "Why remote assessment is not safe for this",
  "results.careNavigation": "Where to go",
  "results.safetyBehind": "Why safety information comes first",
  "results.signalsTitle": "Key health signals",
  "results.patternsTitle": "Possible patterns",
  "results.pattern.explain": "What this could mean",
  "results.pattern.why": "Why it appeared",
  "results.pattern.missing": "What is missing",
  "results.pattern.clinician": "What a clinician may check",
  "results.signals.noticed": "What Nexura noticed",
  "results.signals.unknown": "What is unknown",
  "results.signals.clarify": "What could clarify",
  "results.signals.next": "Suggested next step",
  "results.factorsContributing": "What may be contributing",
  "results.factorsProtective": "What may be protecting you",
  "results.missingTitle": "What we don't know yet",
  "results.missingIntro":
    "Honest gaps — nothing more. Sharing any of these later makes your next check sharper.",
  "results.nextTitle": "What to do next",
  "results.effort.low": "Easy to start",
  "results.effort.moderate": "Takes some planning",
  "results.effort.planned_with_clinician": "Plan with a clinician",
  "results.questionsTitle": "Questions to ask your doctor",
  "results.trendsTitle": "Changes over time",
  "results.trend.improving": "Trending better",
  "results.trend.deteriorating": "Worth watching",
  "results.trend.stable": "Steady",
  "results.trend.insufficient_data": "Not enough data yet",
  "results.routingNoticeTitle": "A note for you",
  "results.triageOnlyNote":
    "Your checks were paused early for your safety — only the emergency screening above ran. No signals were analyzed.",
  "results.actions.save": "View my history",
  "results.actions.savedNote": "Assessments are saved to your history automatically.",
  "results.actions.summary": "Create clinician summary",
  "results.actions.rerun": "Run again",
  "results.actions.report": "Report an issue with this result",
  "results.versionLine": "engine {engine} · ruleset {ruleset} · content {content}",
  "results.completeness": "Information completeness: {n}%",
  "results.confidence.INSUFFICIENT_INFORMATION": "Not enough information yet",
  "results.confidence.LOW_CONFIDENCE": "Low confidence",
  "results.confidence.MODERATE_CONFIDENCE": "Moderate confidence",
  "results.confidence.HIGHER_CONFIDENCE_WITHIN_SCREENING_SCOPE":
    "Higher confidence (screening scope)",
  "results.severity.informational": "Informational",
  "results.severity.watch": "Watch",
  "results.severity.elevated": "Elevated",
  "results.feedback.title": "Report an issue",
  "results.feedback.kind.incorrect": "Something seems incorrect",
  "results.feedback.kind.unclear": "Something was unclear",
  "results.feedback.message": "Tell us what felt off (optional)",
  "results.feedback.submit": "Send feedback",
  "results.feedback.thanks": "Thank you — this helps us make Nexura safer.",
  "results.followUp": "Suggested check-in: in {n} days",

  /* History */
  "history.title": "My history",
  "history.intro": "Everything you've run, in one calm place. Click any row to see it fully.",
  "history.empty": "No assessments yet. Your first one will appear here.",
  "history.date": "Date",
  "history.urgency": "Result",
  "history.completeness": "Info",
  "history.view": "Open",
  "history.trendsTitle": "Your trends",
  "history.trendsIntro":
    "Direction only — small changes need context. A trend is not a conclusion.",
  "history.trendPoints": "{n} entries",
  "history.lastValue": "Latest: {v}{u}",
  "history.backToResults": "Back to latest result",

  /* Summary & share */
  "summary.title": "Summary for your clinician",
  "summary.intro":
    "A structured, neutral summary you can carry to any doctor — it only contains what you shared here.",
  "summary.includes": "Sections to include in the link",
  "summary.fullTitle": "Your summary",
  "summary.sectionPreview": "{n} entries",
  "summary.needOne":
    "Tick at least one section above — a link with nothing in it would not be useful to anyone.",
  "summary.dateRangeNote":
    "The summary covers the information you entered (from {from} to {to}).",
  "summary.createLink": "Create share link",
  "summary.creating": "Creating…",
  "summary.linkLabel": "Share link (valid for 7 days)",
  "summary.copy": "Copy link",
  "summary.copied": "Copied",
  "summary.revoke": "Revoke link",
  "summary.revoked": "Link revoked — it no longer works.",
  "summary.consentNote":
    "Only the sections you tick are included. Anyone with the link can view it until it expires.",
  "summary.expires": "Expires: {when}",
  "summary.section.statement": "Opening statement",
  "summary.section.mainSymptoms": "Main symptoms",
  "summary.section.onsetAndDuration": "Onset & duration",
  "summary.section.progression": "Progression",
  "summary.section.relevantHistory": "Relevant history",
  "summary.section.medications": "Medications",
  "summary.section.allergies": "Allergies",
  "summary.section.recentVitals": "Recent vitals",
  "summary.section.relevantLabs": "Relevant labs",
  "summary.section.lifestyleContext": "Lifestyle context",
  "summary.section.detectedSignals": "Signals noticed",
  "summary.section.missingInformation": "Missing information",
  "summary.section.questionsToAsk": "Questions to consider",
  "summary.generatedAt": "Generated {when}",
  "summary.notFound": "Run an assessment first — the summary is built from your latest result.",

  /* Settings */
  "settings.title": "Settings",
  "settings.intro": "Everything here is yours to change, and changes apply immediately.",
  "settings.consentTitle": "Your consents",
  "settings.consentNote":
    "Turning off Health profile or Assessment stops assessments. Everything else is optional, always.",
  "settings.languageTitle": "Language",
  "settings.notificationsTitle": "Reminders (demo)",
  "settings.notificationsDemoNote":
    "Reminders are stored on this device only and are not sent anywhere in this demo.",
  "settings.quietHours": "Quiet hours",
  "settings.frequency": "How often",
  "settings.freq.weekly": "Once a week",
  "settings.freq.fortnight": "Every two weeks",
  "settings.freq.monthly": "Once a month",
  "settings.freq.never": "Never",
  "settings.exportTitle": "Export my data",
  "settings.exportDesc": "Download everything you've shared with Nexura, as a file.",
  "settings.exportBtn": "Download my data",
  "settings.deleteTitle": "Delete my data",
  "settings.deleteDesc":
    "Removes your profile, answers, assessments, summaries and share links. This cannot be undone.",
  "settings.deleteBtn": "Delete everything",
  "settings.deleteConfirmTitle": "Delete everything?",
  "settings.deleteConfirmBody":
    "This permanently removes all the health information you shared, every assessment, and any share links. There is no undo.",
  "settings.deleteConfirmCta": "Yes, delete everything",
  "settings.deleteConfirmCancel": "Keep my data",
  "settings.deleted": "Your data has been deleted.",
  "settings.auditTitle": "Audit trail",
  "settings.auditIntro":
    "Every action on your information is recorded here — what happened and when, never the content itself.",
  "settings.auditEmpty": "No recorded activity yet.",
  "settings.back": "Back to overview",

  /* Footer */
  "footer.disclaimerNote":
    "Nexura Predictive Health Intelligence is decision support. It does not diagnose and does not replace professional medical care.",
  "footer.emergency":
    "In an emergency, call 108. Free mental-health support: Tele-MANAS 14416, 24×7.",
};

/* ----------------------------- HI -----------------------------
 * Override layer — missing keys fall back to EN at merge time.
 * ----------------------------- */

export const HI: Record<string, string> = {
  "landing.eyebrow": "नेक्सुरा प्रेडिक्टिव हेल्थ इंटेलिजेंस",
  "landing.h1a": "स्वास्थ्य सेवा प्रतिक्रियाशील है।",
  "landing.h1b": "नेक्सुरा है भविष्यवाही।",
  "landing.sub":
    "महत्वपूर्ण स्वास्थ्य संकेतों को जल्दी पहचानें, उनके पीछे की संभावित वजहें समझें, और जानें कि आगे क्या करना है।",
  "landing.ctaPrimary": "मेरे हेल्थ सिग्नल जाँचें",
  "landing.ctaSecondary": "यह कैसे काम करता है",
  "landing.demoBadge": "डेमो — क्लिनिकल रूप से सत्यापित नहीं। हमेशा डॉक्टर से सलाह लें।",
  "landing.trustRow":
    "आपके उत्तर निजी रहते हैं · सहमति आधारित · कभी भी मिटाएँ",
  "landing.howTitle": "यह कैसे काम करता है",
  "landing.how1t": "आप बताते हैं क्या चल रहा है",
  "landing.how2t": "सुरक्षा जाँच सबसे पहले — हमेशा",
  "landing.how3t": "आपको सिग्नल, संदर्भ और साफ़ अगले कदम मिलते हैं — साथ में डॉक्टर को दिखाने के लिए सारांश",
  "landing.safetyTitle": "सुरक्षा कैसे काम करती है",
  "landing.safetyBody":
    "आपातकालीन जाँच किसी भी विश्लेषण से पहले चलती है। जो जानकारी नहीं है, वह ईमानदारी से दिखाई जाती है। हर रिज़ल्ट में इंजन और रूलसेट के वर्ज़न दर्ज रहते हैं।",
  "landing.continueTitle": "जहाँ छोड़ा था, वहीं से आगे",
  "landing.continueDesc": "आपकी पिछली जाँचें और हेल्थ जानकारी सुरक्षित है — वहीं से आगे बढ़ें।",
  "landing.continueCta": "पिछली जाँचें देखें",
  "landing.how1d":
    "एक छोटी, आसान जाँच — लक्षण, इतिहास, दिनचर्या और वाइटल्स। जो नहीं बताना चाहें, वह छोड़ भी सकते हैं।",
  "landing.how2d":
    "किसी भी विश्लेषण से पहले आपातकालीन जाँच चलती है। अगर कुछ तुरंत देखभाल माँगता है, तो वही जानकारी सबसे पहले दिखती है।",
  "landing.how3d":
    "हर सिग्नल के साथ यह भी साफ़ होता है कि नेक्सुरा ने क्या देखा, क्या अज्ञात है, और क्या और स्पष्ट कर सकता है। न कठिन शब्द, न दोष।",
  "landing.backToSite": "Hospital OS पर वापस जाएँ",

  "app.loading": "आपका सुरक्षित सेशन लोड हो रहा है…",
  "app.errorTitle": "कनेक्शन में बाधा आई",
  "app.errorBody": "हम हेल्थ सेवा तक नहीं पहुँच पाए। आपकी कोई जानकारी खोई नहीं है।",
  "app.retry": "फिर कोशिश करें",
  "app.langLabel": "भाषा",
  "app.close": "बंद करें",
  "app.saving": "सेव हो रहा है…",
  "app.demoTag": "डेमो",
  "app.killSwitchTitle": "हेल्थ जाँचें अस्थायी रूप से रुकी हैं",
  "app.killSwitchBody":
    "नेक्सुरा ने नियमित समीक्षा के लिए नई जाँचें रोक दी हैं। आपकी सेव की गई जानकारी सुरक्षित है। कृपया कुछ देर बाद फिर देखें।",
  "app.settings": "सेटिंग्स",
  "app.history": "मेरा इतिहास",
  "app.home": "अवलोकन",
  "app.back": "वापस",
  "app.optional": "वैकल्पिक",
  "app.whyWeAsk": "हम क्यों पूछते हैं",
  "app.skipStep": "यह कदम छोड़ें (वैकल्पिक)",
  "app.continue": "आगे बढ़ें",
  "app.saved": "सेव हो गया",
  "app.notSaved": "सेव नहीं हुआ — फिर कोशिश करें",
  "app.langEn": "English",
  "app.langHi": "हिंदी",

  "consent.title": "पहले आपकी पसंद",
  "consent.blockedNote":
    "जाँच बिना हेल्थ प्रोफ़ाइल और असेसमेंट की अनुमति के नहीं चल सकतीं — आगे बढ़ने के लिए इन्हें चालू करें।",
  "step.consent": "सहमति",
  "step.profile": "आपके बारे में",
  "step.symptoms": "लक्षण",
  "step.conditions": "इतिहास",
  "step.lifestyle": "दिनचर्या",
  "step.vitals": "वाइटल्स",
  "step.review": "समीक्षा",
  "consent.intro":
    "नेक्सुरा केवल वही देखता है जिसकी आप अनुमति देते हैं। ये विकल्प आप बाद में सेटिंग्स में बदल सकते हैं, और सब कुछ कभी भी मिटा सकते हैं।",
  "consent.requiredNote":
    "जाँचों के लिए हेल्थ प्रोफ़ाइल और असेसमेंट ज़रूरी हैं। इनमें से कोई बंद करने पर जाँचें रुक जाती हैं।",

  "profile.title": "आपके बारे में",
  "profile.age": "उम्र (वर्ष)",
  "profile.adultsOnly":
    "नेक्सुरा प्रेडिक्टिव का यह संस्करण 18 वर्ष और उससे अधिक उम्र के वयस्कों के लिए है। बच्चों और किशोरों के लिए कृपया बाल रोग विशेषज्ञ से मिलें।",

  "symptoms.title": "क्या अनुभव हो रहा है?",
  "symptoms.freeText": "अपने शब्दों में",
  "symptoms.mentalHealthNotice":
    "आपको यह अकेले नहीं झेलना है, और अभी सहायता उपलब्ध है। टेली-मनस: 14416 (निःशुल्क, 24×7)। यदि तुरंत खतरा है, तो 108 पर कॉल करें।",

  "running.s1": "पहले सुरक्षा जाँच…",
  "running.s2": "आपकी जानकारी देखी जा रही है…",
  "running.s3": "आपके सिग्नल तैयार हो रहे हैं…",

  "results.urgency.EMERGENCY_NOW": "आपातकाल — अभी कदम उठाएँ",
  "results.urgency.SAME_DAY_MEDICAL_REVIEW": "आज ही डॉक्टर से मिलें",
  "results.urgency.PROMPT_APPOINTMENT": "जल्द अपॉइंटमेंट लें",
  "results.urgency.ROUTINE_FOLLOW_UP": "नियमित फ़ॉलो-अप",
  "results.urgency.MONITOR_AND_PREVENT": "निगरानी जारी रखें",
  "results.safetyBannerTitle": "कृपया पहले यह पढ़ें",
  "results.call108": "108 पर कॉल करें",
  "results.call14416": "टेली-मनस 14416 पर कॉल करें",

  "results.signals.noticed": "नेक्सुरा ने क्या देखा",
  "results.signals.unknown": "क्या अज्ञात है",
  "results.signals.clarify": "क्या स्पष्ट कर सकता है",
  "results.signals.next": "सुझाया अगला कदम",
  "results.factorsContributing": "जो योगदान दे सकता है",
  "results.factorsProtective": "जो आपकी रक्षा कर सकता है",
  "results.missingTitle": "जो हमें अभी नहीं पता",
  "results.nextTitle": "आगे क्या करें",
  "results.questionsTitle": "डॉक्टर से पूछने के सवाल",
  "results.trendsTitle": "समय के साथ बदलाव",

  "lifestyle.sleepQuality": "नींद की गुणवत्ता",
  "lifestyle.sleepQuality.good": "आरामदायक",
  "lifestyle.sleepQuality.fair": "ठीक-ठाक",
  "lifestyle.sleepQuality.poor": "बेचैन / टूटती हुई",

  "summary.title": "आपके डॉक्टर के लिए सारांश",
  "summary.createLink": "शेयर लिंक बनाएँ",
  "summary.copy": "लिंक कॉपी करें",
  "summary.revoke": "लिंक रद्द करें",
  "summary.fullTitle": "आपका सारांश",
  "summary.sectionPreview": "{n} प्रविष्टि/प्रविष्टियाँ",
  "summary.needOne":
    "कृपया ऊपर से कम से कम एक अनुभाग चुनें — खाली लिंक किसी काम का नहीं रहता।",
  "summary.consentNote":
    "केवल वही अनुभाग शामिल हैं जिन्हें आप चुनते हैं। लिंक रखने वाला कोई भी इसे समाप्ति तक देख सकता है।",

  "settings.title": "सेटिंग्स",
  "settings.consentTitle": "आपकी सहमति",
  "settings.deleteBtn": "सब कुछ मिटाएँ",
  "settings.exportBtn": "मेरा डेटा डाउनलोड करें",
  "settings.auditTitle": "ऑडिट ट्रेल",

  "footer.disclaimerNote":
    "नेक्सुरा प्रेडिक्टिव हेल्थ इंटेलिजेंस निर्णय सहायता है। यह रोग निदान नहीं करता और पेशेवर चिकित्सा देखभाल का विकल्प नहीं है।",
  "footer.emergency":
    "आपातकाल में 108 पर कॉल करें। निःशुल्क मानसिक स्वास्थ्य सहायता: टेली-मनस 14416, 24×7।",
};

/** Merged dictionary for a language: HI overrides EN, EN fills the rest. */
export function stringsFor(lang: PhiLang): Record<string, string> {
  return lang === "hi" ? { ...EN, ...HI } : EN;
}

/** Minimal {var} interpolation for the few templated strings. */
export function interpolate(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_match: string, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`
  );
}
