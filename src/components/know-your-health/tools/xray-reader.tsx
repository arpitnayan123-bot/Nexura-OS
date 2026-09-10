"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, AlertTriangle, Sparkles, Stethoscope, ShieldCheck, ImageIcon } from "lucide-react";
import { TOOLS_BY_ID } from "@/components/know-your-health/tools";
import {
  ToolHeader, ImageUploader, ToolTextarea, RunButton, LoadingResult,
  ResultCard, SeverityBadge, Disclaimer, ResetButton, showError,
} from "@/components/know-your-health/ui";

interface UploadedImage { base64: string; mimeType: string; previewUrl: string; }
interface Finding {
  region: string;
  observation: string;
  abnormality: boolean;
  severity?: "low" | "moderate" | "high";
}
interface PossibleAbnormality {
  finding: string;
  likelihood: "Unlikely" | "Possible" | "Likely";
  note: string;
}
interface XrayResult {
  bodyPart: string;
  imageQuality: "good" | "adequate" | "poor";
  findings: Finding[];
  possibleAbnormalities: PossibleAbnormality[];
  summary: string;
  recommendations: string[];
  requiresRadiologistReview: boolean;
  disclaimer: string;
}

const BODY_PARTS = ["Chest", "Hand/Wrist", "Knee", "Spine", "Skull", "Abdomen"] as const;
const QUALITY_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  good: { bg: "#9DB89E15", text: "#5A7A5B", label: "Good" },
  adequate: { bg: "#E0B08015", text: "#B8893D", label: "Adequate" },
  poor: { bg: "#C98A7A15", text: "#9A6A5A", label: "Poor" },
};
const LIKELIHOOD_STYLE: Record<string, { bg: string; text: string }> = {
  "Likely": { bg: "#C98A7A15", text: "#9A6A5A" },
  "Possible": { bg: "#E0B08015", text: "#B8893D" },
  "Unlikely": { bg: "#9DB89E15", text: "#5A7A5B" },
};

export function XrayReader() {
  const tool = TOOLS_BY_ID["xray-reader"];
  const accent = tool.accent;
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [bodyPart, setBodyPart] = useState<string>("Chest");
  const [clinicalContext, setClinicalContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<XrayResult | null>(null);

  const run = async () => {
    if (!image) { showError("Please upload an X-ray image first"); return; }
    if (!bodyPart) { showError("Please select the body part"); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/know-your-health/xray-reader", {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(75_000),
        body: JSON.stringify({
          image: { base64: image.base64, mimeType: image.mimeType },
          bodyPart,
          clinicalContext,
        }),
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

  const reset = () => { setResult(null); setImage(null); setBodyPart("Chest"); setClinicalContext(""); };

  return (
    <div className="space-y-5">
      <ToolHeader title={tool.name} tagline={tool.tagline} icon={tool.icon} accent={accent} inspiration={tool.inspiration} />

      {!result && !loading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5C544D]">Upload X-ray image</label>
            <ImageUploader image={image} onPick={setImage} onClear={() => setImage(null)} accent={accent} label="Drop or click to upload X-ray" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5C544D]">Body part</label>
              <select value={bodyPart} onChange={(e) => setBodyPart(e.target.value)} className="glass-input h-11 w-full rounded-xl px-3.5 text-sm outline-none">
                {BODY_PARTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <div className="rounded-xl glass-chip px-3 py-2 text-[0.65rem] leading-snug text-[#9A8F84]">
                <ImageIcon className="mb-1 h-3 w-3 text-[#7A9A7B]" /> Educational analysis only — not a radiologist's report.
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5C544D]">Clinical context (optional)</label>
            <ToolTextarea value={clinicalContext} onChange={setClinicalContext} placeholder="e.g. 45-year-old male with persistent cough for 3 weeks, smoker…" rows={3} />
          </div>
          <div className="flex items-center gap-3">
            <RunButton onClick={run} loading={loading} disabled={!image || !bodyPart} accent={accent} label="Analyze X-ray with AI" />
            <span className="text-[0.65rem] text-[#9A8F84]">Powered by Gemini Vision · Educational use</span>
          </div>
          <Disclaimer />
        </motion.div>
      )}

      {loading && <LoadingResult accent={accent} />}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
            {result.requiresRadiologistReview && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex items-start gap-3 rounded-2xl p-3.5 shadow-depth" style={{ background: "linear-gradient(135deg, #C98A7A18, #C98A7A08)" }}>
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#9A6A5A]" />
                <div>
                  <p className="text-sm font-semibold text-[#7A4A3A]">A qualified radiologist should review this image</p>
                  <p className="mt-0.5 text-[0.7rem] text-[#9A6A5A]">This AI overview is educational. It does not replace a formal radiology report.</p>
                </div>
              </motion.div>
            )}

            <ResultCard accent={accent} title="Image Overview">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full glass-chip px-2.5 py-0.5 text-[0.65rem] font-semibold text-[#5C544D]">{result.bodyPart}</span>
                {(() => {
                  const q = QUALITY_STYLE[result.imageQuality] || QUALITY_STYLE.adequate;
                  return <span className="rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider" style={{ background: q.bg, color: q.text }}>Image quality · {q.label}</span>;
                })()}
              </div>
              <p className="text-sm leading-relaxed text-[#1F1B17]">{result.summary}</p>
            </ResultCard>

            {result.findings?.length > 0 && (
              <ResultCard accent={accent} title="Visible Findings">
                <div className="overflow-hidden rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#FAF7F2]/70 text-[0.6rem] uppercase tracking-wider text-[#9A8F84]">
                        <th className="px-3 py-2 font-semibold">Region</th>
                        <th className="px-3 py-2 font-semibold">Observation</th>
                        <th className="px-3 py-2 text-right font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE9E0]">
                      {result.findings.map((f, i) => (
                        <motion.tr key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="align-top">
                          <td className="px-3 py-2.5 font-medium text-[#1F1B17]">{f.region}</td>
                          <td className="px-3 py-2.5 text-[#5C544D]">{f.observation}</td>
                          <td className="px-3 py-2.5 text-right">
                            {f.abnormality ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider" style={{ background: "#C98A7A15", color: "#9A6A5A" }}>Abnormal</span>
                                {f.severity && <SeverityBadge level={f.severity} />}
                              </div>
                            ) : (
                              <span className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider" style={{ background: "#9DB89E15", color: "#5A7A5B" }}>Normal</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ResultCard>
            )}

            {result.possibleAbnormalities?.length > 0 && (
              <ResultCard accent="#C98A7A" title="Possible Abnormalities">
                <div className="space-y-2.5">
                  {result.possibleAbnormalities.map((a, i) => {
                    const ls = LIKELIHOOD_STYLE[a.likelihood] || LIKELIHOOD_STYLE.Possible;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3 rounded-xl bg-[#FAF7F2]/60 p-2.5">
                        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `${accent}15`, color: accent }}><AlertTriangle className="h-3.5 w-3.5" /></span>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[#1F1B17]">{a.finding}</p>
                            <span className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider" style={{ background: ls.bg, color: ls.text }}>{a.likelihood}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-[#5C544D]">{a.note}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </ResultCard>
            )}

            {result.recommendations?.length > 0 && (
              <ResultCard accent="#9DB89E" title="Recommendations">
                <ul className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#1F1B17]">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5A7A5B]" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </ResultCard>
            )}

            <div className="flex items-center gap-3">
              <ResetButton onClick={reset} />
              <span className="flex items-center gap-1 text-[0.65rem] text-[#9A8F84]"><Stethoscope className="h-3 w-3" /> {result.disclaimer || "Educational analysis — not a radiology report"}</span>
            </div>
            <Disclaimer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
