"use client";

/* ============================================================
 * NEXURA DIY — ONBOARDING (chat-first "New goals")
 * You land in a chat under the dawn-valley hero: "Tell it like
 * it is. We'll do the rest." Talk once — safety screen, goal
 * drafts (inline cards, editable), granular consent bottom
 * sheet at first processing, safety context (Tune), preview
 * (Build) → generation → Today. Emergency text speaks as a
 * red card with 112/108. Restart-chat control included.
 * ============================================================ */

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, ShieldCheck, Map, Pencil, X, AlertTriangle, RotateCcw, PhoneCall, ArrowRight } from "lucide-react";
import { Scenery } from "./scenery";
import { diyFetch, type ParsedGoalClient, type SafetyPayload, type ConsentScopeRow } from "./client-types";

type Step = "chat" | "tune" | "build" | "done";

interface Bubble {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
}

interface GoalCard extends ParsedGoalClient {
  removed?: boolean;
}

const EXAMPLES = [
  "I want to lose weight, sleep better and my skin keeps breaking out",
  "mera vajan kam karna hai 2 mahine mein, neend bhi theek nahi",
  "Reduce stress and cut screen time at night",
];

export function Onboarding({ booted, onDone }: { booted: boolean; onDone: () => void }) {
  const [step, setStep] = useState<Step>("chat");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [cards, setCards] = useState<GoalCard[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [safety, setSafety] = useState<SafetyPayload | null>(null);
  const [sheet, setSheet] = useState<null | { scope: string; title: string; body: string; onAllow: () => void }>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [genNote, setGenNote] = useState<string | null>(null);
  const [context, setContext] = useState<{ ageBand?: string; dietPreference?: string; budget?: string; conditions?: string }>({});
  const [burdenNote, setBurdenNote] = useState<string | null>(null);

  const composerRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef(false);
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [bubbles, thinking, cards]);

  /* consent: contextual bottom sheet at FIRST processing */
  const ensureConsent = (scope: string, title: string, body: string, onAllow: () => void) => {
    const go = async () => {
      try {
        const res = await diyFetch<{ scopes: ConsentScopeRow[] }>("/api/diy/consent");
        const row = res.scopes.find((s) => s.scope === scope);
        if (row?.granted) return onAllow();
      } catch {
        /* consent check failure should not dead-end the chat */
        return onAllow();
      }
      setSheet({ scope, title, body, onAllow });
    };
    go();
  };

  const runWithConsent = (fn: () => void | Promise<void>) => {
    ensureConsent(
      "GOAL_PARSING",
      "Allow & read my goals",
      "To turn your words into a plan, Nexura DIY processes the goals you type. It stays on your record, never sold, and you can withdraw anytime — withdrawal stops future processing immediately.",
      async () => {
        processedRef.current = true;
        await grantConsent(["GOAL_PARSING"], "onboarding");
        await fn();
      }
    );
  };

  const grantConsent = async (scopes: string[], source: string) => {
    await diyFetch("/api/diy/consent", { method: "POST", body: JSON.stringify({ scopes, policyVersion: "2026-09-diy-1", source }) });
  };

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || thinking) return;
    lastMessageRef.current = text;
    setInput("");
    setBubbles((b) => [...b, { id: `u${Date.now()}`, role: "user", text }]);
    setThinking(true);
    setSafety(null);

    const runParse = async () => {
      try {
        const res = await diyFetch<{
          safety: SafetyPayload;
          language: string | null;
          goals: ParsedGoalClient[];
        }>("/api/diy/parse", { method: "POST", body: JSON.stringify({ text, source: "chat" }) });

        if (res.safety.action === "EMERGENCY" || res.safety.action === "STOP_AND_REFER") {
          setSafety(res.safety);
          setBubbles((b) => [...b, { id: `a${Date.now()}`, role: "assistant", text: res.safety.message ?? "Please seek medical help now." }]);
          return;
        }
        setLanguage(res.language);
        if (!res.goals.length) {
          setBubbles((b) => [...b, {
            id: `a${Date.now()}`,
            role: "assistant",
            text: "Tell me a bit more — for example weight, sleep, stress, skin, hair, fitness, food, energy, digestion, posture, screen time, or smoking/alcohol. One message is fine, English / Hindi / Hinglish all welcome.",
          }]);
          return;
        }
        setCards(res.goals.map((g) => ({ ...g })));
        setBubbles((b) => [...b, {
          id: `a${Date.now()}`,
          role: "assistant",
          text: `I found ${res.goals.length} goal${res.goals.length > 1 ? "s" : ""} in what you said. Review the cards below — edit or remove anything, then confirm.`,
        }]);
      } catch (e) {
        setBubbles((b) => [...b, { id: `a${Date.now()}`, role: "assistant", text: e instanceof Error ? e.message : "Something went wrong — try again." }]);
      } finally {
        setThinking(false);
      }
    };

    if (!processedRef.current) {
      runWithConsent(runParse);
    } else {
      await runParse();
    }
  };

  const confirmGoals = async () => {
    const kept = cards.filter((c) => !c.removed && c.category);
    if (!kept.length) return;
    setThinking(true);
    try {
      const res = await diyFetch<{ ok: boolean; batchId: string; goals: { id: string }[]; trimmed: { rawGoalText: string; reason: string }[] }>("/api/diy/goals", {
        method: "POST",
        body: JSON.stringify({
          batchId: `batch_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          goals: kept.map((c) => ({ clientKey: c.clientKey, rawGoalText: c.rawGoalText, category: c.category, requestedTimeframeDays: c.requestedTimeframeDays })),
        }),
      });
      setBatchId(res.batchId);
      setCards((cs) => cs.map((c) => ({ ...c })));
      const goalIds = res.goals.map((g) => g.id);
      setStep("tune");
      if (res.trimmed?.length) {
        setBubbles((b) => [...b, { id: `t${Date.now()}`, role: "system", text: `Trimmed: ${res.trimmed.map((t) => `${t.rawGoalText} — ${t.reason}`).join(" · ")}` }]);
      }
      setConfirmedIds(goalIds);
    } catch (e) {
      setBubbles((b) => [...b, { id: `a${Date.now()}`, role: "assistant", text: e instanceof Error ? e.message : "Could not save goals." }]);
    } finally {
      setThinking(false);
    }
  };

  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);

  const buildPlan = async () => {
    if (!batchId || !confirmedIds.length) return;
    setThinking(true);
    const run = async () => {
      try {
        const res = await diyFetch<{ ok: boolean; planIds: string[]; burdenNote?: string; conflicts: unknown[]; trimmed: unknown[] }>("/api/diy/generate", {
          method: "POST",
          body: JSON.stringify({ goalIds: confirmedIds, idempotencyKey: `${batchId}-gen1` }),
        });
        setGenNote("Your plan is ready — one rhythm that doesn't fight itself.");
        setBurdenNote(res.burdenNote ?? null);
        setStep("done");
        setTimeout(onDone, 1600);
      } catch (e) {
        setBubbles((b) => [...b, { id: `a${Date.now()}`, role: "assistant", text: e instanceof Error ? e.message : "Generation failed — try again." }]);
        setThinking(false);
      }
    };
    setThinking(false);
    ensureConsent(
      "PLAN_GENERATION",
      "Allow & build my plan",
      "Your goals become a roadmap generated on Nexura's safety-checked templates — no crash promises, honest timeframes. Withdrawal anytime stops future processing.",
      async () => {
        await grantConsent(["PLAN_GENERATION"], "onboarding");
        setThinking(true);
        await run();
      }
    );
  };

  const restart = () => {
    setBubbles([]);
    setCards([]);
    setStep("chat");
    setSafety(null);
    setBatchId(null);
    setConfirmedIds([]);
    processedRef.current = false;
  };

  const heroVisible = bubbles.length === 0 && !thinking;

  return (
    <div className="relative">
      {/* ---------- full-bleed valley hero ---------- */}
      <section className="relative overflow-hidden" style={{ height: "clamp(470px, 72vh, 600px)" }}>
        <Scenery className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-x-0 top-6 z-10 flex justify-center px-4">
          <div className="nx-glass-chip flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B5138]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#A16207]" />
            Nexura DIY · No sign-in needed
          </div>
        </div>
        <div className="absolute inset-x-0 top-1/2 z-10 mx-auto w-[min(92%,560px)] -translate-y-1/2">
          <div className="nx-glass-deep rounded-3xl px-6 py-7 text-center sm:px-10">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-[#2E2A26] sm:text-4xl">
              Tell it like it is.
              <span className="block bg-gradient-to-r from-[#D9B87C] via-[#A16207] to-[#7A9A7B] bg-clip-text text-transparent">
                We&apos;ll do the rest.
              </span>
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#6B5D4E]">
              One chat about your situation — safety screen, realistic timeframes and one plan that doesn&apos;t fight itself, all follow from what you say.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-[#6B5138]">
              <span className="nx-glass-chip rounded-full px-3 py-1">Free in beta</span>
              <span className="nx-glass-chip rounded-full px-3 py-1">No sign-in</span>
              <span className="nx-glass-chip rounded-full px-3 py-1">Hinglish welcome</span>
              <span className="nx-glass-chip rounded-full px-3 py-1">Not a diagnosis</span>
            </div>
            {heroVisible && (
              <button onClick={() => composerRef.current?.focus()} className="diy-btn-primary mt-6 text-sm">
                Start talking <Send size={15} aria-hidden />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ---------- chat card floating over the lake ---------- */}
      <section className="relative z-10 mx-auto -mt-8 w-[min(96%,720px)] pb-28">
        <div className="nx-glass-deep rounded-3xl p-4 sm:p-6">
          {/* step rail */}
          <ol className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
            {([["chat", "Tell"], ["tune", "Tune"], ["build", "Plan"]] as const).map(([key, label], i) => {
              const active = step === key || (key === "chat" && step === "done");
              const idx = ["chat", "tune", "build"].indexOf(step === "done" ? "build" : step);
              const done = i < idx || step === "done";
              return (
                <li key={key} className="flex items-center gap-2">
                  <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${active ? "bg-[#A16207] text-[#FFF6EA]" : done ? "bg-[#7A9A7B]/20 text-[#4E6845]" : "bg-[#F1E6D4] text-[#8A7A66]"}`}>
                    {done ? <ShieldCheck size={12} aria-hidden /> : key === "tune" ? <Sparkles size={12} aria-hidden /> : key === "build" ? <Map size={12} aria-hidden /> : null}
                    {label}
                  </span>
                  {i < 2 && <span className="h-px w-4 bg-[#E0D0B8]" aria-hidden />}
                </li>
              );
            })}
            <li className="ml-auto">
              {(bubbles.length > 0 || cards.length > 0) && (
                <button onClick={restart} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium normal-case tracking-normal text-[#8A7A66] hover:bg-[#F1E6D4] hover:text-[#2E2A26]">
                  <RotateCcw size={11} aria-hidden /> Restart chat
                </button>
              )}
            </li>
          </ol>

          {/* thread */}
          <div ref={threadRef} className="max-h-[46vh] space-y-3 overflow-y-auto pr-1" aria-live="polite">
            {!heroVisible && bubbles.length === 0 && !thinking && (
              <p className="rounded-2xl bg-[#FBF5EA] px-4 py-3 text-sm text-[#6B5D4E]">Hi — tell me what you&apos;d like to work on. One message is fine.</p>
            )}
            {bubbles.map((b) =>
              b.role === "system" ? (
                <p key={b.id} className="rounded-2xl border border-[#E7D9C4] bg-[#F7EEDD] px-4 py-2.5 text-xs leading-relaxed text-[#8A7454]">{b.text}</p>
              ) : (
                <div key={b.id} className={`flex ${b.role === "user" ? "justify-end" : "justify-start"}`}>
                  <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${b.role === "user" ? "bg-[#A16207] text-[#FFF6EA]" : "bg-[#FBF5EA] text-[#4E4237]"}`}>{b.text}</p>
                </div>
              )
            )}
            {thinking && (
              <div className="flex justify-start">
                <span className="flex items-center gap-1 rounded-2xl bg-[#FBF5EA] px-4 py-3" aria-label="Thinking">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C9A98C]" style={{ animationDelay: `${i * 140}ms` }} />
                  ))}
                </span>
              </div>
            )}

            {/* emergency / refer card */}
            {safety && (
              <div role="alert" className="rounded-2xl border border-[#C0392B]/40 bg-[#FDEBE8] p-4">
                <div className="mb-1.5 flex items-center gap-2 text-[#A93226]">
                  <AlertTriangle size={16} aria-hidden />
                  <span className="text-sm font-semibold">{safety.action === "EMERGENCY" ? "This sounds like an emergency" : "This needs real medical care, not a plan"}</span>
                </div>
                <p className="text-sm leading-relaxed text-[#7B3A30]">{safety.message}</p>
                {safety.action === "EMERGENCY" && (
                  <div className="mt-3 flex gap-2">
                    <a href="tel:112" className="diy-btn-primary flex-1 text-xs"><PhoneCall size={13} aria-hidden /> Call 112</a>
                    <a href="tel:108" className="diy-btn-primary flex-1 text-xs"><PhoneCall size={13} aria-hidden /> Ambulance 108</a>
                  </div>
                )}
              </div>
            )}

            {/* goal cards */}
            {cards.length > 0 && step === "chat" && (
              <div className="space-y-2.5">
                {cards.filter((c) => !c.removed).map((c) => (
                  <div key={c.clientKey} className="rounded-2xl border border-[#EADDC7] bg-[#FFFDF8] p-3.5 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#2E2A26]">{c.rawGoalText}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10.5px]">
                          <span className={`rounded-full px-2 py-0.5 font-semibold ${c.category ? "bg-[#7A9A7B]/18 text-[#4E6845]" : "bg-[#F1E6D4] text-[#8A7A66]"}`}>
                            {c.category ? c.category.replace(/_/g, " ").toLowerCase() : "needs a category"}
                          </span>
                          {c.requestedTimeframeDays && <span className="rounded-full bg-[#F1E6D4] px-2 py-0.5 text-[#8A7454]">you said {c.requestedTimeframeDays} days</span>}
                          <span className="text-[#A08D74]">{Math.round(c.confidence * 100)}% match</span>
                        </div>
                        {c.clarifyQuestion && <p className="mt-2 text-xs italic leading-relaxed text-[#8A7454]">{c.clarifyQuestion}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          aria-label={`Edit goal: ${c.rawGoalText}`}
                          onClick={() => {
                            setInput(c.rawGoalText);
                            setCards((cs) => cs.map((x) => (x.clientKey === c.clientKey ? { ...x, removed: true } : x)));
                            composerRef.current?.focus();
                          }}
                          className="rounded-full p-1.5 text-[#8A7A66] hover:bg-[#F1E6D4]"
                        >
                          <Pencil size={13} aria-hidden />
                        </button>
                        <button
                          aria-label={`Remove goal: ${c.rawGoalText}`}
                          onClick={() => setCards((cs) => cs.map((x) => (x.clientKey === c.clientKey ? { ...x, removed: true } : x)))}
                          className="rounded-full p-1.5 text-[#8A7A66] hover:bg-[#F1E6D4]"
                        >
                          <X size={13} aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {cards.some((c) => !c.removed && c.category) && (
                  <button onClick={confirmGoals} disabled={thinking} className="diy-btn-primary w-full text-sm">
                    Looks right — continue <ArrowRight size={15} aria-hidden />
                  </button>
                )}
              </div>
            )}

            {/* tune step */}
            {step === "tune" && (
              <div className="space-y-3 rounded-2xl border border-[#EADDC7] bg-[#FFFDF8] p-4">
                <p className="text-sm font-medium text-[#2E2A26]">A few honest questions — they keep the plan safe and real.</p>
                <div>
                  <label className="text-xs font-medium text-[#6B5D4E]" htmlFor="diy-age">Age band</label>
                  <select id="diy-age" value={context.ageBand ?? ""} onChange={(e) => setContext((c) => ({ ...c, ageBand: e.target.value || undefined }))} className="mt-1 w-full rounded-xl border border-[#E0D0B8] bg-white px-3 py-2 text-sm">
                    <option value="">Prefer not to say</option>
                    <option value="18_25">18–25</option>
                    <option value="26_35">26–35</option>
                    <option value="36_45">36–45</option>
                    <option value="46_60">46–60</option>
                    <option value="over_60">60+</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6B5D4E]" htmlFor="diy-diet">Food preference</label>
                  <select id="diy-diet" value={context.dietPreference ?? ""} onChange={(e) => setContext((c) => ({ ...c, dietPreference: e.target.value || undefined }))} className="mt-1 w-full rounded-xl border border-[#E0D0B8] bg-white px-3 py-2 text-sm">
                    <option value="">No preference</option>
                    <option value="veg">Vegetarian</option>
                    <option value="eggetarian">Eggetarian</option>
                    <option value="non_veg">Non-vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="jain">Jain</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6B5D4E]" htmlFor="diy-cond">Conditions we should know about (comma-separated)</label>
                  <input id="diy-cond" value={context.conditions ?? ""} onChange={(e) => setContext((c) => ({ ...c, conditions: e.target.value }))} placeholder="e.g. thyroid, PCOS — or leave empty" className="mt-1 w-full rounded-xl border border-[#E0D0B8] bg-white px-3 py-2 text-sm" />
                </div>
                <button onClick={() => setStep("build")} className="diy-btn-primary w-full text-sm">Continue <ArrowRight size={15} aria-hidden /></button>
              </div>
            )}

            {/* build step */}
            {step === "build" && (
              <div className="space-y-3 rounded-2xl border border-[#EADDC7] bg-[#FFFDF8] p-4">
                <p className="text-sm font-medium text-[#2E2A26]">Ready to build your plan</p>
                <ul className="space-y-1.5 text-xs leading-relaxed text-[#6B5D4E]">
                  <li>• Deterministic roadmaps from Indian public-health sources — no crash promises.</li>
                  <li>• Conflicting goals are reconciled; your daily load is capped so it stays doable.</li>
                  <li>• Safety screen already ran. Emergencies never become goals.</li>
                </ul>
                <button onClick={buildPlan} disabled={thinking} className="diy-btn-primary w-full text-sm">
                  {thinking ? "Building…" : "Create my plan"} <Sparkles size={15} aria-hidden />
                </button>
              </div>
            )}

            {/* done */}
            {step === "done" && (
              <div className="rounded-2xl border border-[#CBDCc4] bg-[#EFF5E9] p-4 text-center">
                <ShieldCheck className="mx-auto mb-2 text-[#4E6845]" size={22} aria-hidden />
                <p className="text-sm font-medium text-[#3D5540]">{genNote ?? "Your plan is ready."}</p>
                {burdenNote && <p className="mt-1.5 text-xs text-[#5E7350]">{burdenNote}</p>}
                <p className="mt-1 text-xs text-[#6B7D58]">Taking you to Today…</p>
              </div>
            )}
          </div>

          {/* composer */}
          <form
            className="mt-4 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              ref={composerRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={booted ? "Tell it like it is — weight, sleep, stress, skin…" : "Waking the valley…"}
              disabled={!booted}
              aria-label="Describe your goals"
              className="h-12 flex-1 rounded-full border border-[#E0D0B8] bg-white/90 px-5 text-sm outline-none transition placeholder:text-[#B3A28A] focus:border-[#B8860B] focus:ring-2 focus:ring-[#D9B87C]/40 disabled:opacity-60"
            />
            <button type="submit" disabled={!booted || !input.trim() || thinking} aria-label="Send message" className="diy-btn-icon-terra shrink-0 disabled:opacity-50">
              <Send size={17} aria-hidden />
            </button>
          </form>
          <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1">
            {EXAMPLES.map((x) => (
              <button key={x} onClick={() => send(x)} disabled={!booted || thinking} className="shrink-0 rounded-full border border-[#E0D0B8] bg-white/70 px-3 py-1 text-[11px] text-[#6B5D4E] transition hover:border-[#B8860B] hover:text-[#A16207] disabled:opacity-50">
                {x.length > 42 ? `${x.slice(0, 42)}…` : x}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* consent bottom sheet */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Consent">
          <button aria-label="Close consent sheet" onClick={() => setSheet(null)} className="absolute inset-0 bg-[#2E2A26]/45 backdrop-blur-[2px]" />
          <div className="nx-glass-deep relative mx-4 mb-6 w-full max-w-md rounded-3xl p-6 pb-8">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D9C8AC]" aria-hidden />
            <h2 className="text-lg font-semibold text-[#2E2A26]">{sheet.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#6B5D4E]">{sheet.body}</p>
            <ul className="mt-3 space-y-1 text-xs text-[#6B5D4E]">
              <li>• Scope requested now: <strong>{sheet.scope.replace(/_/g, " ").toLowerCase()}</strong></li>
              <li>• Policy version 2026-09-diy-1 · granular, never bundled</li>
            </ul>
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={async () => {
                  const fn = sheet.onAllow;
                  setSheet(null);
                  await fn();
                }}
                className="diy-btn-primary flex-1 text-sm"
              >
                {sheet.title}
              </button>
              <button onClick={() => setSheet(null)} className="flex-1 rounded-full border border-[#E0D0B8] px-4 py-3 text-sm font-medium text-[#6B5D4E] hover:bg-[#F7EEDD]">
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
