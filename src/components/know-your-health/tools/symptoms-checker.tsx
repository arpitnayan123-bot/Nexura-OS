"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, HeartPulse, Stethoscope, Sparkles, Activity, MessageCircle, Loader2 } from "lucide-react";
import { TOOLS_BY_ID } from "@/components/know-your-health/tools";
import { ToolHeader, ToolTextarea, RunButton, LoadingResult, ResultCard, SeverityBadge, Disclaimer, ResetButton, showError } from "@/components/know-your-health/ui";
import { toast } from "sonner";

interface PossibleCause { condition: string; likelihood: "low"|"moderate"|"high"; note: string; }
interface SymptomsResult {
  summary: string;
  urgency: "low"|"moderate"|"high"|"emergency";
  possibleCauses: PossibleCause[];
  recommendedActions: string[];
  redFlags: string[];
  specialty: string;
  disclaimer: string;
}

const SUGGESTION_CHIPS = [
  "Headache for 2 days",
  "Fever with body pain",
  "Stomach pain and bloating",
  "Cough and sore throat",
  "Chest tightness",
  "Feeling tired all the time",
];

export function SymptomsChecker() {
  const tool = TOOLS_BY_ID["symptoms-checker"];
  const accent = tool.accent;
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SymptomsResult | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  // ── Nexura Connect integration ────────────────────────────────
  // When urgency is moderate / high / emergency, surface a "Chat with a Doctor"
  // CTA card. Button creates a Nexura Connect connection with the on-call GP
  // (Dr. Aanya Kapoor). Wrapped in try/catch — never blocks the symptom checker.
  const connectToDoctor = async () => {
    if (connecting || connected) return;
    setConnecting(true);
    try {
      const patientName = "Guest User";
      const patientId = `kyh-guest-${Date.now()}`;
      const res = await fetch("/api/connect/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: "kyh-doctor-general-01",
          doctorName: "Dr. Aanya Kapoor",
          doctorSpecialty: "General Physician",
          patientId,
          patientName,
          source: "know_your_health",
          sourceRefId: "symptoms-checker",
        }),
      });
      if (!res.ok) throw new Error();
      setConnected(true);
      toast.success("Connected to Dr. Aanya Kapoor");
    } catch {
      toast.error("Could not connect to a doctor");
    } finally {
      setConnecting(false);
    }
  };

  const run = async () => {
    if (!symptoms.trim()) { showError("Please describe your symptoms first"); return; }
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/know-your-health/symptoms-checker", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.detail || e?.error || "request_failed");
      }
      const data = await res.json();
      setResult(data);
    } catch (e) {
      showError(e instanceof Error ? e.message : undefined);
    } finally { setLoading(false); }
  };

  const reset = () => { setResult(null); setSymptoms(""); setConnected(false); };

  return (
    <div className="space-y-5">
      <ToolHeader title={tool.name} tagline={tool.tagline} icon={tool.icon} accent={accent} inspiration={tool.inspiration} />

      {!result && !loading && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5C544D]">Describe your symptoms</label>
            <ToolTextarea value={symptoms} onChange={setSymptoms} placeholder="e.g. I have a throbbing headache on the right side since morning, with mild nausea and sensitivity to light…" rows={5} />
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTION_CHIPS.map((s) => (
              <button key={s} onClick={() => setSymptoms(s)} className="rounded-full glass-chip px-3 py-1.5 text-xs text-[#5C544D] transition-all hover:scale-105">{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <RunButton onClick={run} loading={loading} disabled={!symptoms.trim()} accent={accent} label="Triage with AI" />
            <span className="text-[0.65rem] text-[#9A8F84]">Powered by Gemini · Indian clinical context</span>
          </div>
          <Disclaimer />
        </motion.div>
      )}

      {loading && <LoadingResult accent={accent} />}

      <AnimatePresence>
        {result && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} className="space-y-4">
            <ResultCard accent={accent} title="Triage Summary">
              <div className="mb-3 flex items-center gap-2">
                <SeverityBadge level={result.urgency} />
                <span className="text-[0.65rem] uppercase tracking-wider text-[#9A8F84]">Suggested specialty</span>
                <span className="rounded-full glass-chip px-2 py-0.5 text-[0.65rem] font-medium text-[#5C544D]">{result.specialty}</span>
              </div>
              <p className="text-sm leading-relaxed text-[#1F1B17]">{result.summary}</p>
            </ResultCard>

            {result.possibleCauses?.length > 0 && (
              <ResultCard accent={accent} title="Possible Causes">
                <div className="space-y-2.5">
                  {result.possibleCauses.map((c, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl bg-[#FAF7F2]/60 p-2.5">
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background:`${accent}15`, color:accent }}><Stethoscope className="h-3.5 w-3.5" /></span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#1F1B17]">{c.condition}</p>
                          <span className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider" style={{ background:`${accent}15`, color:accent }}>{c.likelihood}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#5C544D]">{c.note}</p>
                      </div>
                    </div>
                  ))}
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

            {/* Nexura Connect — Chat with a Doctor CTA */}
            {(result.urgency === "moderate" || result.urgency === "high" || result.urgency === "emergency") && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-2xl glass-soft shadow-depth"
              >
                <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white" style={{ background: "linear-gradient(135deg, #D98B6E, #C98A7A)" }}>
                  <MessageCircle className="h-3.5 w-3.5" /> Nexura Connect — Talk to a real doctor
                </div>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#D98B6E] to-[#C98A7A] font-serif text-base font-bold text-white shadow-depth">AK</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#1F1B17]">Dr. Aanya Kapoor</p>
                      <p className="text-[0.7rem] text-[#9A8F84]">General Physician · Available now · Avg reply &lt; 5 min</p>
                      <p className="mt-1.5 text-xs text-[#5C544D]">Your symptoms suggest it would help to talk to a doctor. Connect now for chat, voice, or video follow-up.</p>
                    </div>
                  </div>
                  <button
                    onClick={connectToDoctor}
                    disabled={connecting || connected}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D98B6E] to-[#E0B080] px-4 py-2.5 text-sm font-semibold text-white shadow-depth transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {connecting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</>
                    ) : connected ? (
                      <><Sparkles className="h-4 w-4" /> Connected — open Nexura Connect</>
                    ) : (
                      <><MessageCircle className="h-4 w-4" /> Chat with Dr. Aanya Kapoor</>
                    )}
                  </button>
                  {connected && (
                    <p className="mt-2 text-center text-[0.65rem] text-[#5A7A5B]">
                      ✓ Connection created — visit <a href="/connect/patient" className="font-semibold underline">Nexura Connect</a> to start chatting
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            <div className="flex items-center gap-3">
              <ResetButton onClick={reset} />
              <span className="flex items-center gap-1 text-[0.65rem] text-[#9A8F84]"><HeartPulse className="h-3 w-3" /> {result.disclaimer || "Informational only — consult a doctor for diagnosis"}</span>
            </div>
            <Disclaimer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
