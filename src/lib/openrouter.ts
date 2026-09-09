/** OpenRouter AI client — SERVER-SIDE ONLY.
 *  Falls back to the pre-configured z-ai-web-dev-sdk (GLM) when no
 *  OPENROUTER_API_KEY is present, so AI features work in any environment. */
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

async function callZAI(messages: ORMsg[]): Promise<string> {
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
  return text;
}

interface ORMsg { role: "user"|"system"|"assistant"; content: string | Array<{type:"text";text:string}|{type:"image_url";image_url:{url:string}}>; }

async function callOR(messages: ORMsg[], maxTokens = 8192): Promise<string> {
  // No OpenRouter key → use the built-in z-ai SDK path directly.
  if (!getKey()) return callZAI(messages);
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
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
        }),
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
      return c;
    } catch (e: any) {
      lastError = e;
      // If OpenRouter fails (bad key, quota, network), fall back to z-ai SDK.
      try { return await callZAI(messages); } catch { throw e; }
    }
  }
  throw lastError || new Error("OpenRouter failed after retries");
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

export async function runText<T = any>(prompt: string, systemInstruction?: string): Promise<T> {
  const msgs: ORMsg[] = [];
  if (systemInstruction) msgs.push({ role: "system", content: systemInstruction });
  msgs.push({ role: "user", content: prompt });
  return parseJson<T>(await callOR(msgs, 8192));
}

export async function runVision<T = any>(imageBase64: string, mimeType: string, prompt: string): Promise<T> {
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  return parseJson<T>(await callOR([{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: dataUrl } }] }], 8192));
}

export function isValidImageBase64(s: string): boolean {
  return typeof s === "string" && s.length > 1000 && /^[A-Za-z0-9+/=\s]+$/.test(s);
}

export const INDIA_PREAMBLE = `You are Nexa, the AI health assistant for Nexura OS — a healthcare platform built for India.
Context:
- Use Indian reference ranges (ICMR, NFHS-5, ICMR-INDIAB)
- Mention Indian dietary options (roti, dal, sabzi, rice, idli, dosa, etc.)
- Consider Indian lifestyle factors (vegetarianism common, diabetes prevalence high)
- Be warm but professional. Avoid alarmist language. Always recommend consulting a doctor for serious concerns.
- You are NOT a replacement for a doctor. You provide informational guidance only.
- Respond in clean JSON only. No markdown, no prose outside JSON.`;
