"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Check, X, Trophy, RotateCcw, Sparkles } from "lucide-react";
import { TOOLS_BY_ID } from "@/components/know-your-health/tools";
import { ToolHeader, RunButton, LoadingResult, ResultCard, Disclaimer, ResetButton, showError } from "@/components/know-your-health/ui";

interface Q { id: string; question: string; options: string[]; correctIndex: number; explanation: string; topic: string; }
interface ScoreResult {
  score: number; total: number; percentage: number; grade: string;
  results: { question: string; options: string[]; userAnswer: number; correctAnswer: number; isCorrect: boolean; explanation: string; topic: string; }[];
}

export function HealthQuiz() {
  const tool = TOOLS_BY_ID["health-quiz"];
  const accent = tool.accent;
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);

  const start = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/know-your-health/health-quiz", { method: "GET" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.detail || e?.error || "request_failed");
      }
      const data = await res.json();
      setQuestions(data.questions || []);
      setAnswers({});
      setStep(0);
      setResult(null);
    } catch (e) {
      showError(e instanceof Error ? e.message : undefined);
    } finally { setLoading(false); }
  };

  const pick = (qid: string, idx: number) => {
    setAnswers({ ...answers, [qid]: idx });
    setTimeout(() => {
      if (step < questions.length - 1) setStep(step + 1);
    }, 200);
  };

  const submit = async () => {
    if (Object.keys(answers).length < questions.length) { showError("Please answer all questions"); return; }
    setScoring(true);
    try {
      const res = await fetch("/api/know-your-health/health-quiz", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, answers }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.detail || e?.error || "request_failed");
      }
      setResult(await res.json());
    } catch (e) {
      showError(e instanceof Error ? e.message : undefined);
    } finally { setScoring(false); }
  };

  const reset = () => { setQuestions([]); setAnswers({}); setResult(null); setStep(0); };

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  return (
    <div className="space-y-5">
      <ToolHeader title={tool.name} tagline={tool.tagline} icon={tool.icon} accent={accent} inspiration={tool.inspiration} />

      {questions.length === 0 && !loading && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-4">
          <ResultCard accent={accent} title="Ready to play?">
            <div className="flex flex-col items-center py-4">
              <div className="grid h-16 w-16 place-items-center rounded-full shadow-depth" style={{ background:`linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
                <Brain className="h-7 w-7 text-white" />
              </div>
              <p className="mt-3 font-serif text-xl font-bold text-[#1F1B17]">10 questions · ~3 minutes</p>
              <p className="mt-1 text-xs text-[#9A8F84]">Nutrition · diseases · first aid · Indian context</p>
            </div>
          </ResultCard>
          <div className="flex items-center gap-3">
            <RunButton onClick={start} loading={loading} disabled={loading} accent={accent} label="Start the quiz" />
            <span className="text-[0.65rem] text-[#9A8F84]">Fresh questions every time · powered by Gemini</span>
          </div>
          <Disclaimer />
        </motion.div>
      )}

      {loading && <LoadingResult accent={accent} />}

      {questions.length > 0 && !result && !loading && (
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-4">
          <div className="rounded-2xl glass-soft p-4 shadow-depth">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#5C544D]">Question {step + 1} of {questions.length}</p>
              <span className="rounded-full glass-chip px-2.5 py-0.5 text-[0.65rem] font-medium text-[#5A7A5B]">{answeredCount}/{questions.length} answered</span>
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[#EFE9E0]">
              <motion.div animate={{ width: `${((step + 1) / questions.length) * 100}%` }} className="h-full rounded-full" style={{ background:`linear-gradient(90deg, ${accent}, ${accent}cc)` }} />
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}} transition={{duration:0.2}}>
                <p className="mb-1 text-[0.6rem] font-semibold uppercase tracking-wider text-[#9A8F84]">{questions[step].topic}</p>
                <p className="mb-3 font-serif text-lg font-semibold text-[#1F1B17]">{questions[step].question}</p>
                <div className="space-y-2">
                  {questions[step].options.map((opt, i) => (
                    <button key={i} onClick={() => pick(questions[step].id, i)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${answers[questions[step].id] === i ? "glass-input shadow-depth" : "glass-chip hover:scale-[1.01]"}`} style={answers[questions[step].id] === i ? { borderColor: `${accent}80` } : {}}>
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold" style={{ background:`${accent}15`, color: accent }}>{String.fromCharCode(65 + i)}</span>
                      <span className="text-[#1F1B17]">{opt}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="mt-3 flex items-center justify-between">
              <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="rounded-full glass-chip px-3 py-1.5 text-xs text-[#5C544D] disabled:opacity-30">← Back</button>
              {step < questions.length - 1 ? (
                <button onClick={() => setStep(Math.min(questions.length - 1, step + 1))} className="rounded-full glass-chip px-3 py-1.5 text-xs text-[#5C544D]">Next →</button>
              ) : (
                <button onClick={submit} disabled={!allAnswered || scoring} className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white shadow-depth disabled:opacity-40" style={{ background:`linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
                  {scoring ? "Scoring…" : <>Submit <Trophy className="h-3 w-3" /></>}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {scoring && !result && <LoadingResult accent={accent} />}

      <AnimatePresence>
        {result && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} className="space-y-4">
            <ResultCard accent={accent} title="Your Result">
              <div className="flex flex-col items-center py-4">
                <motion.div initial={{ scale: 0.5, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 10 }} className="grid h-24 w-24 place-items-center rounded-full shadow-depth" style={{ background:`linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
                  <Trophy className="h-11 w-11 text-white" />
                </motion.div>
                <p className="mt-3 font-serif text-4xl font-bold text-[#1F1B17]">{result.percentage}%</p>
                <p className="text-sm text-[#5C544D]">{result.score} out of {result.total} correct</p>
                <span className="mt-2 rounded-full glass-chip px-3 py-1 text-[0.65rem] font-semibold text-[#5A7A5B]">{result.grade}</span>
              </div>
            </ResultCard>

            <ResultCard accent={accent} title="Review Answers">
              <div className="space-y-3">
                {result.results.map((r, i) => (
                  <div key={i} className="rounded-xl bg-[#FAF7F2]/60 p-3">
                    <div className="mb-2 flex items-start gap-2">
                      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-white ${r.isCorrect ? "bg-[#5A7A5B]" : "bg-[#C98A7A]"}`}>
                        {r.isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      </span>
                      <div>
                        <p className="text-[0.55rem] font-semibold uppercase tracking-wider text-[#9A8F84]">{r.topic}</p>
                        <p className="text-sm font-medium text-[#1F1B17]">{r.question}</p>
                      </div>
                    </div>
                    <div className="space-y-1 pl-7">
                      <p className="text-xs">
                        <span className="text-[#9A8F84]">Your answer: </span>
                        <span className={r.isCorrect ? "font-medium text-[#5A7A5B]" : "font-medium text-[#9A6A5A]"}>{r.userAnswer >= 0 ? r.options[r.userAnswer] : "—"}</span>
                      </p>
                      {!r.isCorrect && (
                        <p className="text-xs">
                          <span className="text-[#9A8F84]">Correct: </span>
                          <span className="font-medium text-[#5A7A5B]">{r.options[r.correctAnswer]}</span>
                        </p>
                      )}
                      <p className="mt-1 flex items-start gap-1 text-xs text-[#5C544D]"><Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[#9DB89E]" /><span>{r.explanation}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </ResultCard>

            <div className="flex items-center gap-3">
              <ResetButton onClick={reset} />
              <button onClick={start} className="flex items-center gap-1.5 rounded-full glass-chip px-3 py-1.5 text-xs font-medium text-[#5C544D] transition-all hover:scale-105"><RotateCcw className="h-3 w-3" /> Play again</button>
            </div>
            <Disclaimer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
