"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, AlertTriangle, Activity, Sparkles, Stethoscope, HeartPulse } from "lucide-react";
import { TOOLS_BY_ID } from "@/components/know-your-health/tools";
import {
  ToolHeader, ImageUploader, ToolTextarea, RunButton, LoadingResult,
  ResultCard, SeverityBadge, Disclaimer, ResetButton, showError,
} from "@/components/know-your-health/ui";

interface UploadedImage { base64: string; mimeType: string; previewUrl: string; }
interface PossibleCondition {
  name: string;
  confidence: "Likely" | "Possible" | "Less likely";
  description: string;
}
interface DermaResult {
  description: string;
  possibleConditions: PossibleCondition[];
  urgency: "low" | "moderate" | "high";
  recommendedActions: string[];
  redFlags: string[];
  whenToSeeDermatologist: string;
  disclaimer: string;
}

const CONCERN_CHIPS = [
  "Acne / pimples",
  "Dark spots / pigmentation",
  "Dry, itchy patch",
  "Rash that appeared today",
  "Mole that changed",
  "Hair fall related",
];

const confidenceStyle: Record<string, { bg: string; text: string }> = {
  "Likely": { bg: "#C98A7A15", text: "#9A6A5A" },
  "Possible": { bg: "#E0B08015", text: "#B8893D" },
  "Less likely": { bg: "#9DB89E15", text: "#5A7A5B" },
};

export function DermaScan() {
  const tool = TOOLS_BY_ID["derma-scan"];
  const accent = tool.accent;
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [concern, setConcern] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DermaResult | null>(null);

  const run = async () => {
    if (!image) { showError("Please upload a skin photo first"); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/know-your-health/derma-scan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(75_000),
        body: JSON.stringify({ image: { base64: image.base64, mimeType: image.mimeType }, concern }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.detail || e?.error || "request_failed");
      }
      setResult(await res.json());
    } catch (e) {
      showError(e instanceof Error ? e.message : undefined);
    } finally { setLoading(false); }
  };

  const reset = () => { setResult(null); setImage(null); setConcern(""); };

  return (
    <div className="space-y-5">
      <ToolHeader title={tool.name} tagline={tool.tagline} icon={tool.icon} accent={accent} inspiration={tool.inspiration} />

      {!result && !loading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5C544D]">Upload a close-up of the skin concern</label>
            <ImageUploader image={image} onPick={setImage} onClear={() => setImage(null)} accent={accent} label="Drop or click to upload skin photo" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5C544D]">Describe the concern (optional)</label>
            <ToolTextarea value={concern} onChange={setConcern} placeholder="e.g. Itchy, red patch on the right forearm that appeared 3 days ago and is slowly spreading…" rows={3} />
            <div className="mt-2 flex flex-wrap gap-2">
              {CONCERN_CHIPS.map((c) => (
                <button key={c} onClick={() => setConcern(c)} className="rounded-full glass-chip px-3 py-1.5 text-xs text-[#5C544D] transition-all hover:scale-105">{c}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RunButton onClick={run} loading={loading} disabled={!image} accent={accent} label="Analyze skin with AI" />
            <span className="text-[0.65rem] text-[#9A8F84]">Powered by Gemini Vision · Not a diagnosis</span>
          </div>
          <Disclaimer />
        </motion.div>
      )}

      {loading && <LoadingResult accent={accent} />}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
            <ResultCard accent={accent} title="Visual Description">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-[0.65rem] uppercase tracking-wider text-[#9A8F84]">Urgency</span>
                <SeverityBadge level={result.urgency} />
              </div>
              <p className="text-sm leading-relaxed text-[#1F1B17]">{result.description}</p>
            </ResultCard>

            {result.possibleConditions?.length > 0 && (
              <ResultCard accent={accent} title="Possible Conditions">
                <div className="space-y-2.5">
                  {result.possibleConditions.map((c, i) => {
                    const cs = confidenceStyle[c.confidence] || confidenceStyle["Possible"];
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3 rounded-xl bg-[#FAF7F2]/60 p-2.5">
                        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `${accent}15`, color: accent }}><ScanLine className="h-3.5 w-3.5" /></span>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[#1F1B17]">{c.name}</p>
                            <span className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider" style={{ background: cs.bg, color: cs.text }}>{c.confidence}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-[#5C544D]">{c.description}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </ResultCard>
            )}

            {result.recommendedActions?.length > 0 && (
              <ResultCard accent="#9DB89E" title="Recommended Actions">
                <ul className="space-y-2">
                  {result.recommendedActions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1B17]">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5A7A5B]" />
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </ResultCard>
            )}

            {result.redFlags?.length > 0 && (
              <ResultCard accent="#C98A7A" title="Red Flags — Seek Immediate Care">
                <ul className="space-y-2">
                  {result.redFlags.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#9A6A5A]">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </ResultCard>
            )}

            <ResultCard accent={accent} title="When to See a Dermatologist">
              <div className="flex items-start gap-2.5">
                <Stethoscope className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
                <p className="text-sm leading-relaxed text-[#1F1B17]">{result.whenToSeeDermatologist}</p>
              </div>
            </ResultCard>

            <div className="flex items-center gap-3">
              <ResetButton onClick={reset} />
              <span className="flex items-center gap-1 text-[0.65rem] text-[#9A8F84]"><HeartPulse className="h-3 w-3" /> {result.disclaimer || "Informational only — not a diagnosis"}</span>
            </div>
            <Disclaimer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
