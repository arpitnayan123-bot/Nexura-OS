/* ============================================================
 * NEXURA DIY — LANGUAGE LAYER
 * Detects en / hi (Devanagari) / hinglish (romanized Hindi),
 * and normalizes the most common romanized-Hindi wellness words
 * so the deterministic parser understands "1 mahine mein weight
 * kam karna hai" without any model call.
 * ============================================================ */

export type DetectedLanguage = "en" | "hi" | "hinglish";

export function detectLanguage(text: string): DetectedLanguage {
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  const hinglishWords = [
    "hai", "hain", "karna", "karni", "karne", "chahiye", "mujhe", "mera", "meri", "mein", "main",
    "kam", "jyada", "zyada", "bahut", "achha", "theek", "nahi", "nahin", "haan", "bhi", "aur",
    "mahine", "mahina", "hafta", "hafte", "din", "saal", "sal",
    "neend", "thakan", "tension", "pareshan", "pet", "dard", "sehat",
    "kaise", "kya", "chahta", "chahti", "raha", "rahi", "sakta", "sakti", "wajan", "vajan",
  ];
  const tokens = text.toLowerCase().split(/[^a-z\u0900-\u097F]+/).filter(Boolean);
  if (!tokens.length) return "en";
  const hits = tokens.filter((t) => hinglishWords.includes(t)).length;
  return hits / tokens.length >= 0.18 || hits >= 2 ? "hinglish" : "en";
}

/** romanized-Hindi → english keyword map for category + timeframe hints. */
export const HINGLISH_DICTIONARY: Record<string, string> = {
  vajan: "weight", wajan: "weight", motapa: "obesity", patla: "thin",
  neend: "sleep", sona: "sleep",
  tension: "stress", pareshan: "stress", chinta: "anxiety", ghabrahat: "anxiety",
  thakan: "fatigue", kamzori: "weakness",
  pet: "stomach", kabz: "constipation", gas: "bloating",
  sar: "head", dard: "pain", kamar: "back",
  sehat: "health",
  chhaya: "acne", pimples: "acne", daane: "acne", chehra: "face",
  baal: "hair", jhadd: "hairfall", jhad: "hairfall",
  cigarette: "smoking", sharab: "alcohol",
};

export function normalizeHinglish(text: string): string {
  let out = ` ${text.toLowerCase()} `;
  for (const [hi, en] of Object.entries(HINGLISH_DICTIONARY)) {
    out = out.replace(new RegExp(`\\b${hi}\\b`, "g"), ` ${en} `);
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Timeframe extraction across en + hinglish:
 *  "in 2 months" → 60, "1 mahine" → 30, "3 hafte" → 21, "45 din" → 45. */
export function extractTimeframeDays(text: string): number | null {
  const t = text.toLowerCase();
  const units: [RegExp, number][] = [
    [/(\d+)\s*(?:months?\b|mahine?|mahino|maheene?)/, 30],
    [/(\d+)\s*(?:weeks?\b|hafte?|hafto)/, 7],
    [/(\d+)\s*(?:days?\b|dino?\b)/, 1],
  ];
  for (const [re, mult] of units) {
    const m = t.match(re);
    if (m) return parseInt(m[1], 10) * mult;
  }
  const words: Record<string, number> = {
    ek: 1, do: 2, teen: 3, char: 4, panch: 5, paanch: 5, che: 6, chah: 6, saat: 7, aath: 8, nau: 9, das: 10,
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };
  const w = t.match(/\b([a-z]+)\s+(months?|mahine?|mahino|weeks?|hafte?|hafto|days?|dino?)\b/);
  if (w && words[w[1]]) {
    const mult = /month|mahin/.test(w[2]) ? 30 : /week|haft/.test(w[2]) ? 7 : 1;
    return words[w[1]] * mult;
  }
  return null;
}
