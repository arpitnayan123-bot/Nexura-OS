/* ============================================================
 * NEXURA DIY — CONTENT VALIDATOR (scrubs unsafe plan content)
 * Runs on EVERY roadmap (deterministic or AI-enriched) before
 * persistence. Cures claims, calorie prescriptions, pregnancy-
 * unsafe actives, injection/drug suggestions: all blocked.
 * ============================================================ */

export interface ContentIssue {
  rule: string;
  snippet: string;
}

const RULES: { rule: string; re: RegExp }[] = [
  { rule: "cure_claim", re: /\b(?:cure[sd]?|cures\s+cancer|permanent\s+remedy| guaranteed\s+cure|pakka\s+ilaj|jadh\s+ilaj)\b/i },
  { rule: "calorie_rx", re: /\b(?:eat|khaao?)\s+(?:exactly\s+)?\d{3,4}\s*(?:kcal|calories)|\d{3,4}\s*kcal\s*(?:per\s+day|daily|only)|sirf\s+\d{3,4}\s*(?:cal|kcal)/i },
  { rule: "pregnancy_unsafe", re: /\b(?:retinol|tretinoin|isotretinoin|salicylic\s+acid\s+(?:peel|high)|accutane)\b/i },
  { rule: "injection_or_rx", re: /\b(?:inject|injection\s+(?:lagwa|weekly|monthly|dose)|(?:take|use)\s+the\s+injection|insulin\s+dose|steroid\s+course|prescri\b|\b\d+\s*mg\s+(?:daily|twice|thrice|per\s+day|a\s+day))\b/i },
  { rule: "extreme_deficit", re: /\b(?:skip\s+(?:all|both)\s+meals| starvation|bhookha?\s+rehna\s+hai|no\s+food\s+for\s+\d+)\b/i },
  { rule: "supplement_overdose", re: /\b(?:\d{3,}\s*(?:mg|iu)\s+(?:of\s+)?(?:vitamin\s*[ade]|zinc|iron)\b)/i },
  { rule: "diagnostic_claim", re: /\b(?:you\s+(?:definitely\s+)?have|tumhe\s+(?:pakka|hoga)|diagnos)\b/i },
];

export function validateContent(text: string): { ok: boolean; issues: ContentIssue[] } {
  const issues: ContentIssue[] = [];
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) issues.push({ rule: r.rule, snippet: m[0].slice(0, 80) });
  }
  return { ok: issues.length === 0, issues };
}

/** Strip the offending line(s) instead of failing the whole plan when a
 *  single task text trips a rule — used as a last-resort sanitizer. */
export function sanitizeLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => validateContent(line).ok)
    .join("\n");
}
