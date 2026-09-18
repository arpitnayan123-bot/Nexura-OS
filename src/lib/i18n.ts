/* ============================================================
   NEXURA OS v5 — I18N ENGINE (India-first)
   Six languages out of the box: English, Hindi, Tamil, Telugu,
   Gujarati, Marathi. Covers OS chrome (nav, actions, statuses);
   clinical content stays English until terminology review per
   NAMASTE/ICD-TM standards. Locale date/time via Intl.
   Fallback chain: requested → English → key.
   ============================================================ */

export const LOCALES = ["en", "hi", "ta", "te", "gu", "mr"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
  ta: "தமிழ்",
  te: "తెలుగు",
  gu: "ગુજરાતી",
  mr: "मराठी",
};

type Dict = Record<string, string>;

const en: Dict = {
  "shell.modules": "Modules",
  "shell.overview": "Overview",
  "shell.clinical": "Clinical",
  "shell.operations": "Operations",
  "shell.system": "System",
  "shell.online": "Online",
  "shell.offline": "Offline",
  "shell.search": "Search patients…",
  "action.save": "Save",
  "action.cancel": "Cancel",
  "action.close": "Close",
  "action.open": "Open",
  "action.complete": "Complete",
  "action.escalate": "Escalate",
  "action.sign": "Sign",
  "action.approve": "Approve",
  "status.critical": "CRITICAL",
  "status.high": "HIGH",
  "status.medium": "MEDIUM",
  "status.low": "LOW",
  "status.active": "Active",
  "status.done": "Done",
  "status.pending": "Pending",
  "status.escalated": "Escalated",
  "ai.disclaimer": "AI-generated — requires clinician review",
  "offline.banner": "Offline — changes will sync when back online",
};

const hi: Dict = {
  "shell.modules": "मॉड्यूल",
  "shell.overview": "अवलोकन",
  "shell.clinical": "क्लिनिकल",
  "shell.operations": "परिचालन",
  "shell.system": "सिस्टम",
  "shell.online": "ऑनलाइन",
  "shell.offline": "ऑफ़लाइन",
  "shell.search": "मरीज़ खोजें…",
  "action.save": "सहेजें",
  "action.cancel": "रद्द करें",
  "action.close": "बंद करें",
  "action.open": "खोलें",
  "action.complete": "पूर्ण",
  "action.escalate": "एस्कलेट",
  "action.sign": "हस्ताक्षर",
  "action.approve": "स्वीकृत",
  "status.critical": "गंभीर",
  "status.high": "उच्च",
  "status.medium": "मध्यम",
  "status.low": "कम",
  "status.active": "सक्रिय",
  "status.done": "पूर्ण",
  "status.pending": "लंबित",
  "status.escalated": "एस्कलेटेड",
  "ai.disclaimer": "एआई-निर्मित — चिकित्सक की समीक्षा आवश्यक",
  "offline.banner": "ऑफ़लाइन — ऑनलाइन आने पर परिवर्तन सिंक होंगे",
};

const ta: Dict = {
  "shell.modules": "தொகுதிகள்",
  "shell.overview": "மேலோட்டம்",
  "shell.clinical": "மருத்துவ",
  "shell.operations": "செயல்பாடுகள்",
  "shell.system": "அமைப்பு",
  "shell.online": "ஆன்லைன்",
  "shell.offline": "ஆஃப்லைன்",
  "shell.search": "நோயாளியைத் தேடு…",
  "action.save": "சேமி",
  "action.cancel": "ரத்து",
  "action.close": "மூடு",
  "action.open": "திற",
  "action.complete": "முடிந்தது",
  "action.escalate": "மேல்நிலை",
  "action.sign": "கையொப்பம்",
  "action.approve": "அனுமதி",
  "status.critical": "மிக அவசரம்",
  "status.high": "அதிக",
  "status.medium": "நடுத்தர",
  "status.low": "குறைவு",
  "status.active": "செயலில்",
  "status.done": "முடிந்தது",
  "status.pending": "நிலுவையில்",
  "status.escalated": "மேல்நிலை",
  "ai.disclaimer": "AI-உருவாக்கியது — மருத்துவர் சோதனை தேவை",
  "offline.banner": "ஆஃப்லைன் — மீண்டும் இணைக்கும்போது ஒத்திசைக்கப்படும்",
};

const te: Dict = {
  "shell.modules": "మాడ్యూల్స్",
  "shell.overview": "అవలోకనం",
  "shell.clinical": "క్లినికల్",
  "shell.operations": "కార్యకలాపాలు",
  "shell.system": "సిస్టమ్",
  "shell.online": "ఆన్‌లైన్",
  "shell.offline": "ఆఫ్‌లైన్",
  "shell.search": "రోగిని వెతకండి…",
  "action.save": "సేవ్",
  "action.cancel": "రద్దు",
  "action.close": "మూసివేయి",
  "action.open": "తెరువు",
  "action.complete": "పూర్తి",
  "action.escalate": "ఎస్కలేట్",
  "action.sign": "సంతకం",
  "action.approve": "ఆమోదించు",
  "status.critical": "కీలక",
  "status.high": "ఎక్కువ",
  "status.medium": "మధ్యస్థ",
  "status.low": "తక్కువ",
  "status.active": "క్రియాశీల",
  "status.done": "పూర్తయింది",
  "status.pending": "పెండింగ్",
  "status.escalated": "ఎస్కలేటెడ్",
  "ai.disclaimer": "AI-రూపొందించినది — వైద్యుడి సమీక్ష అవసరం",
  "offline.banner": "ఆఫ్‌లైన్ — తిరిగి కనెక్ట్ అయినప్పుడు సింక్ అవుతుంది",
};

const gu: Dict = {
  "shell.modules": "મોડ્યુલ્સ",
  "shell.overview": "ઝાંખી",
  "shell.clinical": "ક્લિનિકલ",
  "shell.operations": "કામગીરી",
  "shell.system": "સિસ્ટમ",
  "shell.online": "ઓનલાઇન",
  "shell.offline": "ઓફલાઇન",
  "shell.search": "દર્દી શોધો…",
  "action.save": "સાચવો",
  "action.cancel": "રદ કરો",
  "action.close": "બંધ કરો",
  "action.open": "ખોલો",
  "action.complete": "પૂર્ણ",
  "action.escalate": "એસ્કેલેટ",
  "action.sign": "સહી",
  "action.approve": "મંજૂર",
  "status.critical": "ગંભીર",
  "status.high": "ઉચ્ચ",
  "status.medium": "મધ્યમ",
  "status.low": "નીચું",
  "status.active": "સક્રિય",
  "status.done": "પૂર્ણ",
  "status.pending": "બાકી",
  "status.escalated": "એસ્કેલેટેડ",
  "ai.disclaimer": "AI-જનિત — ડૉક્ટરની સમીક્ષા જરૂરી",
  "offline.banner": "ઓફલાઇન — ફરી કનેક્ટ થાય ત્યારે સિંક થશે",
};

const mr: Dict = {
  "shell.modules": "मॉड्यूल्स",
  "shell.overview": "आढावा",
  "shell.clinical": "क्लिनिकल",
  "shell.operations": "कार्ये",
  "shell.system": "सिस्टम",
  "shell.online": "ऑनलाइन",
  "shell.offline": "ऑफलाइन",
  "shell.search": "रुग्ण शोधा…",
  "action.save": "जतन करा",
  "action.cancel": "रद्द",
  "action.close": "बंद",
  "action.open": "उघडा",
  "action.complete": "पूर्ण",
  "action.escalate": "एस्कलेट",
  "action.sign": "स्वाक्षरी",
  "action.approve": "मंजूर",
  "status.critical": "गंभीर",
  "status.high": "उच्च",
  "status.medium": "मध्यम",
  "status.low": "कमी",
  "status.active": "सक्रिय",
  "status.done": "पूर्ण",
  "status.pending": "प्रलंबित",
  "status.escalated": "एस्कलेटेड",
  "ai.disclaimer": "AI-निर्मित — डॉक्टरांचे परीक्षण आवश्यक",
  "offline.banner": "ऑफलाइन — पुन्हा कनेक्ट झाल्यावर सिंक होईल",
};

const DICTS: Record<Locale, Dict> = { en, hi, ta, te, gu, mr };

export function t(locale: Locale | string, key: string): string {
  const loc = (LOCALES.includes(locale as Locale) ? locale : "en") as Locale;
  return DICTS[loc][key] ?? DICTS.en[key] ?? key;
}

export function localeTag(locale: Locale | string): string {
  const map: Partial<Record<Locale, string>> = {
    hi: "hi-IN",
    ta: "ta-IN",
    te: "te-IN",
    gu: "gu-IN",
    mr: "mr-IN",
  };
  const loc = (LOCALES.includes(locale as Locale) ? locale : "en") as Locale;
  return map[loc] ?? "en-IN";
}

export function formatDateTime(d: Date, locale: Locale | string): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}
