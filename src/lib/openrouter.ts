/** OpenRouter AI client — SERVER-SIDE ONLY.
 *  Falls back to the pre-configured z-ai-web-dev-sdk (GLM) when no
 *  OPENROUTER_API_KEY is present, so AI features work in any environment.
 *  ASR: only the z-ai SDK provides speech-to-text today (documented capability gap)
 *  Every call is recorded into the AiUsageLog ledger (src/lib/ai-usage.ts) —
 *  capability, provider, tokens, integer-micro-USD cost, latency, fallback. */
import {
  estimateCostMicroUsd,
  estimateTokens,
  estimateTokensFromChars,
  normalizeProviderUsage,
  recordAiUsage,
} from "@/lib/ai-usage";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "z-ai/glm-5.3-flash";
let _key: string | null = null;

function getKey(): string | null {
  if (_key) return _key;
  const k = process.env.OPENROUTER_API_KEY;
  if (!k || !k.startsWith("sk-or-")) return null;
  _key = k; return k;
}

let _zai: any = null;
async function getZAI(): Promise<any> {
  if (_zai) return _zai;
  const { default: ZAI } = await import("z-ai-web-dev-sdk");
  _zai = await ZAI.create();
  return _zai;
}

/** z-ai SDK call. Returns the text plus whatever usage object the SDK
 *  happened to include (its types are `any` — normalizeProviderUsage sorts it out). */
async function callZAI(messages: ORMsg[]): Promise<{ text: string; usage: unknown }> {
  const zai = await getZAI();
  const hasImage = messages.some(
    (m) => Array.isArray(m.content) && m.content.some((p: any) => p?.type === "image_url")
  );
  const converted = messages.map((m) => ({
    role: m.role === "system" ? "assistant" : m.role,
    content: m.content as any,
  }));
  const completion = hasImage
    ? await zai.chat.completions.createVision({ messages: converted })
    : await zai.chat.completions.create({ messages: converted, thinking: { type: "disabled" } });
  const text = completion?.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Empty response from model");
  return { text, usage: completion?.usage ?? null };
}

interface ORMsg { role: "user"|"system"|"assistant"; content: string | Array<{type:"text";text:string}|{type:"image_url";image_url:{url:string}}>; }

const OPENROUTER_TIMEOUT_MS = 45_000; // bound every AI call — a hung provider must never hold the route open

/** Approximate the prompt size for token estimation (chars across all parts). */
function promptCharCount(messages: ORMsg[]): number {
  return messages.reduce((n, m) => {
    if (typeof m.content === "string") return n + m.content.length;
    return n + m.content.reduce((k, p) => k + ("text" in p ? (p.text?.length ?? 0) : 0), 0);
  }, 0);
}

/** Build and fire the ledger row for one AI call. Tokens/cost are estimated
 *  from the char heuristic when the provider did not report usage; cost from
 *  the provider's own `cost` field when OpenRouter reports it. Every derived
 *  number is honestly labelled via tokenSource/costSource — never guessed
 *  silently. A failed call records source="unknown" with the truncated error. */
function recordCall(
  capability: string,
  started: number,
  promptChars: number,
  provider: "openrouter" | "z-ai",
  fallbackUsed: boolean,
  out: { ok: boolean; text?: string; usage?: unknown; costUsd?: number | null; error?: unknown }
): void {
  const latencyMs = Date.now() - started;
  const u = out.ok ? normalizeProviderUsage(out.usage) : null;
  let tokensPrompt: number | null = u?.prompt ?? null;
  let tokensCompletion: number | null = u?.completion ?? null;
  let tokensTotal: number | null = u?.total ?? null;
  let tokenSource: "provider" | "estimated" | "unknown" = u ? "provider" : "unknown";
  let costMicroUsd: number | null = null;
  let costSource: "provider" | "estimated" | "unknown" = "unknown";

  if (out.ok && u === null) {
    // Provider reported nothing usable — estimate from char counts.
    tokensPrompt = estimateTokensFromChars(promptChars);
    tokensCompletion = estimateTokens(out.text ?? "");
    tokensTotal = tokensPrompt + tokensCompletion;
    tokenSource = "estimated";
  }
  if (out.costUsd != null && Number.isFinite(out.costUsd) && out.costUsd >= 0) {
    costMicroUsd = Math.round(out.costUsd * 1_000_000);
    costSource = "provider";
  } else if (out.ok && tokensTotal !== null) {
    if (tokensPrompt === null && tokensCompletion === null) {
      // Total-only shape (z-ai { tokens }) — price the whole at completion rate (conservative).
      costMicroUsd = estimateCostMicroUsd(MODEL, 0, tokensTotal);
    } else {
      costMicroUsd = estimateCostMicroUsd(MODEL, tokensPrompt ?? 0, tokensCompletion ?? 0);
    }
    costSource = "estimated";
  }

  recordAiUsage({
    capability,
    provider,
    model: MODEL,
    tokensPrompt,
    tokensCompletion,
    tokensTotal,
    costMicroUsd,
    tokenSource,
    costSource,
    latencyMs,
    success: out.ok,
    fallbackUsed,
    errorCode: out.ok ? null : out.error instanceof Error ? out.error.message : String(out.error ?? "unknown"),
  });
}

async function callOR(messages: ORMsg[], maxTokens = 8192, capability = "unattributed"): Promise<string> {
  const started = Date.now();
  const promptChars = promptCharCount(messages);
  // No OpenRouter key → use the built-in z-ai SDK path directly.
  if (!getKey()) {
    try {
      const r = await callZAI(messages);
      recordCall(capability, started, promptChars, "z-ai", false, { ok: true, text: r.text, usage: r.usage });
      return r.text;
    } catch (e) {
      recordCall(capability, started, promptChars, "z-ai", false, { ok: false, error: e });
      throw e;
    }
  }
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getKey()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://nexura-os.app",
        "X-Title": "Nexura OS",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.4,
        // Ask OpenRouter to report token usage + cost for this generation
        // (accounting honesty: prefer provider-reported numbers over estimates).
        usage: { include: true },
      }),
      signal: AbortSignal.timeout(OPENROUTER_TIMEOUT_MS),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      let m = `OpenRouter ${res.status}`;
      try { const e = JSON.parse(t); m = e?.error?.message || m; } catch { if (t) m += `: ${t.slice(0, 200)}`; }
      throw new Error(m);
    }
    const d = await res.json();
    const c = d.choices?.[0]?.message?.content || "";
    if (!c) throw new Error("Empty response from model");
    recordCall(capability, started, promptChars, "openrouter", false, {
      ok: true,
      text: c,
      usage: d.usage,
      costUsd: d.usage?.cost ?? d.usage?.total_cost ?? null,
    });
    return c;
  } catch (e) {
    // One OpenRouter attempt, then the z-ai SDK fallback. No retry loop —
    // the previous loop's second iteration was unreachable dead code.
    try {
      const r = await callZAI(messages);
      recordCall(capability, started, promptChars, "z-ai", true, { ok: true, text: r.text, usage: r.usage });
      return r.text;
    } catch {
      recordCall(capability, started, promptChars, "z-ai", true, { ok: false, error: e });
      throw e;
    }
  }
}

function parseJson<T>(text: string): T {
  const t = text.trim();
  try { return JSON.parse(t) as T; } catch {
    const c = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const s = c.indexOf("{"), e = c.lastIndexOf("}");
    if (s >= 0 && e > s) {
      try { return JSON.parse(c.slice(s, e + 1)) as T; } catch {
        let cleaned = c.slice(s, e + 1)
          .replace(/,\s*}/g, "}")
          .replace(/,\s*]/g, "]")
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/[\u2018\u2019]/g, "'");
        try { return JSON.parse(cleaned) as T; } catch {}
        let depth = 0, endIdx = -1;
        for (let i = 0; i < c.length; i++) {
          if (c[i] === '{') depth++;
          else if (c[i] === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
        }
        if (endIdx > 0) {
          const slice = c.slice(s, endIdx + 1).replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
          return JSON.parse(slice) as T;
        }
        return JSON.parse(cleaned) as T;
      }
    }
    return JSON.parse(c) as T;
  }
}

/** capability: feature label recorded in the AiUsageLog ledger (e.g. "kyh.food-scan") —
 *  optional for backward compatibility; unlabeled calls land under "unattributed". */
export async function runText<T = any>(prompt: string, systemInstruction?: string, capability?: string): Promise<T> {
  const msgs: ORMsg[] = [];
  if (systemInstruction) msgs.push({ role: "system", content: systemInstruction });
  msgs.push({ role: "user", content: prompt });
  return parseJson<T>(await callOR(msgs, 8192, capability));
}

export async function runVision<T = any>(imageBase64: string, mimeType: string, prompt: string, capability?: string): Promise<T> {
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  return parseJson<T>(await callOR([{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: dataUrl } }] }], 8192, capability));
}

/** Multi-turn chat — raw text out (no JSON parsing). Same provider order,
 *  one-shot fallback, and 45s timeout as every call here; on the z-ai path
 *  "system" roles are mapped exactly as callZAI does. */
export async function runChatText(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  capability?: string
): Promise<string> {
  return callOR(messages, 8192, capability);
}

/** Single-prompt raw-text call — like runText but returns the model output
 *  verbatim (no parseJson) for routes whose output is prose/markdown. */
export async function runTextRaw(prompt: string, systemInstruction?: string, capability?: string): Promise<string> {
  const msgs: ORMsg[] = [];
  if (systemInstruction) msgs.push({ role: "system", content: systemInstruction });
  msgs.push({ role: "user", content: prompt });
  return callOR(msgs, 8192, capability);
}

export function isValidImageBase64(s: string): boolean {
  return typeof s === "string" && s.length > 1000 && /^[A-Za-z0-9+/=\s]+$/.test(s);
}

/** The model that will ACTUALLY serve the next call, for telemetry honesty.
 *  Depends on which provider path is configured in this environment —
 *  OpenRouter when a key is present, the built-in z-ai SDK otherwise. */
export function activeModelId(): string {
  return getKey() ? `${MODEL} (via OpenRouter)` : `${MODEL} (via z-ai SDK)`;
}

export const INDIA_PREAMBLE = `You are Nexa, the AI health assistant for Nexura OS — a healthcare platform built for India.
Context:
- Use Indian reference ranges (ICMR, NFHS-5, ICMR-INDIAB)
- Mention Indian dietary options (roti, dal, sabzi, rice, idli, dosa, etc.)
- Consider Indian lifestyle factors (vegetarianism common, diabetes prevalence high)
- Be warm but professional. Avoid alarmist language. Always recommend consulting a doctor for serious concerns.
- You are NOT a replacement for a doctor. You provide informational guidance only.
- Respond in clean JSON only. No markdown, no prose outside JSON.`;
