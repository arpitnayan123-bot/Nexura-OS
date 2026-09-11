/* ============================================================
 * PHI — results screen
 * SAFETY-LOCKED ORDER (do not reorder):
 *   1. Emergency banner(s)      — rose, calm, blocks the rest
 *   2. Urgency banner
 *   3. DEMO badge + versions
 *   4. Key health signals       (omitted when triageOnly)
 *   5. Possible patterns
 *   6. Contributing / protective factors
 *   7. Missing information
 *   8. What to do next
 *   9. Questions to ask your doctor
 *  10. Trends
 *  11. Disclaimer + actions
 * ============================================================ */

"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  FileText,
  Flag,
  ListChecks,
  Minus,
  PhoneCall,
  RefreshCcw,
  Sparkles,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PredictiveHealthAssessment,
  RiskSignal,
  PossibleHealthPattern,
  RecommendedNextStep,
  TrendObservation,
  SafetyAlert,
} from "@/modules/phi/contracts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ConfidenceChip,
  DemoBadge,
  SectionCard,
  SeverityDot,
  UrgencyBanner,
  usePhiT,
} from "./ui-primitives";

/* ---------------- helpers ---------------- */

/** Metrics where a rising number is the good direction. */
const UP_IS_GOOD = new Set(["sleep_hours", "activity_minutes", "spo2"]);

function TrendArrow({ direction, metric }: { direction: TrendObservation["direction"]; metric: string }) {
  const upIsGood = UP_IS_GOOD.has(metric);
  if (direction === "improving") {
    return upIsGood ? (
      <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-teal-300" />
    ) : (
      <ArrowDownRight aria-hidden="true" className="h-4 w-4 text-teal-300" />
    );
  }
  if (direction === "deteriorating") {
    return upIsGood ? (
      <ArrowDownRight aria-hidden="true" className="h-4 w-4 text-amber-300" />
    ) : (
      <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-amber-300" />
    );
  }
  if (direction === "stable") {
    return <Minus aria-hidden="true" className="h-4 w-4 text-slate-400" />;
  }
  return <CircleDashed aria-hidden="true" className="h-4 w-4 text-slate-500" />;
}

function isMentalHealthAlert(alert: SafetyAlert): boolean {
  const blob = `${alert.ruleId} ${alert.title} ${alert.userAction} ${alert.careNavigation}`.toLowerCase();
  return /(harm|manas|mental|psych|14416|suicid)/.test(blob);
}

/* ---------------- emergency banner ---------------- */

function EmergencyBanner({ alert }: { alert: SafetyAlert }) {
  const { t } = usePhiT();
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-300/60 bg-rose-300/10 p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-rose-300" />
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-rose-200/90">
            {t("results.safetyBannerTitle")}
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {alert.title}
          </h2>
          <p className="mt-3 text-lg font-semibold leading-snug text-white sm:text-xl">
            {alert.userAction}
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="text-sm font-semibold text-slate-100">
              {t("results.whyUnsafeLabel")}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
              {alert.whyRemoteAssessmentUnsafe}
            </p>
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="text-sm font-semibold text-slate-100">
              {t("results.careNavigation")}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
              {alert.careNavigation}
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="tel:108"
              className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-rose-200 px-6 py-3 text-base font-bold text-[#2A0A12] shadow-[0_10px_30px_-10px_rgba(253,164,175,0.6)] transition hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200"
            >
              <PhoneCall aria-hidden="true" className="h-5 w-5" />
              {t("results.call108")}
            </a>
            {isMentalHealthAlert(alert) && (
              <a
                href="tel:14416"
                className="inline-flex min-h-[52px] items-center gap-2 rounded-full border border-white/25 bg-white/[0.06] px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200"
              >
                <PhoneCall aria-hidden="true" className="h-5 w-5" />
                {t("results.call14416")}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- signal & pattern cards ---------------- */

function SignalCard({ signal }: { signal: RiskSignal }) {
  const { t } = usePhiT();
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-white/20 sm:p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <SeverityDot severity={signal.severity} />
        <h3 className="text-base font-semibold tracking-tight text-white">
          {signal.label}
        </h3>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
          {t(`results.severity.${signal.severity}`)}
        </span>
        <ConfidenceChip
          confidence={signal.confidence}
          label={t(`results.confidence.${signal.confidence}`)}
        />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-teal-300/20 bg-teal-300/[0.05] p-3.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-200">
            {t("results.signals.noticed")}
          </h4>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
            {signal.observation}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("results.signals.unknown")}
          </h4>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
            {signal.whatIsUnknown}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("results.signals.clarify")}
          </h4>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
            {signal.whatCouldClarify}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("results.signals.next")}
          </h4>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
            {signal.recommendedNextStep}
          </p>
        </div>
      </div>
    </article>
  );
}

function PatternCard({ pattern }: { pattern: PossibleHealthPattern }) {
  const { t } = usePhiT();
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <Sparkles aria-hidden="true" className="h-4 w-4 text-teal-300" />
        <h3 className="text-base font-semibold tracking-tight text-white">
          {pattern.label}
        </h3>
        <ConfidenceChip
          confidence={pattern.confidence}
          label={t(`results.confidence.${pattern.confidence}`)}
        />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-200">
        {pattern.plainExplanation}
      </p>
      <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("results.pattern.why")}
          </h4>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            {pattern.whyItAppeared}
          </p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("results.pattern.clinician")}
          </h4>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            {pattern.whatClinicianMayEvaluate}
          </p>
        </div>
        <div className="sm:col-span-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("results.pattern.missing")}
          </h4>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            {pattern.missingInformation}
          </p>
        </div>
      </div>
      {(pattern.supportingInputs.length > 0 || pattern.contradictingInputs.length > 0) && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {pattern.supportingInputs.map((i) => (
            <span
              key={`s-${i}`}
              className="rounded-full border border-teal-300/25 bg-teal-300/[0.07] px-2.5 py-0.5 text-[11px] text-teal-200"
            >
              {i}
            </span>
          ))}
          {pattern.contradictingInputs.map((i) => (
            <span
              key={`c-${i}`}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-slate-400"
            >
              {i}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function FactorChips({ title, items, positive }: { title: string; items: string[]; positive: boolean }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[13px]",
              positive
                ? "border-teal-300/30 bg-teal-300/[0.08] text-teal-100"
                : "border-amber-300/30 bg-amber-300/[0.08] text-amber-100"
            )}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function NextStepCard({ step }: { step: RecommendedNextStep }) {
  const { t } = usePhiT();
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight text-white">{step.title}</h3>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
          {t(`results.effort.${step.effort}`)}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.detail}</p>
    </article>
  );
}

/* ---------------- feedback dialog ---------------- */

function FeedbackDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (kind: string, message: string) => Promise<void>;
}) {
  const { t } = usePhiT();
  const [kind, setKind] = useState<"incorrect" | "unclear">("unclear");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setSending(true);
    try {
      await onSubmit(kind, message);
      setSent(true);
      setMessage("");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/15 bg-[#0E1830] text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-white">{t("results.feedback.title")}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {t("results.actions.report")}
          </DialogDescription>
        </DialogHeader>
        {sent ? (
          <p className="rounded-xl border border-teal-300/30 bg-teal-300/10 p-4 text-sm text-teal-100">
            {t("results.feedback.thanks")}
          </p>
        ) : (
          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="mb-1.5 text-sm font-medium text-slate-200">
                {t("results.feedback.title")}
              </legend>
              {(
                [
                  { v: "incorrect", label: t("results.feedback.kind.incorrect") },
                  { v: "unclear", label: t("results.feedback.kind.unclear") },
                ] as const
              ).map((o) => (
                <label
                  key={o.v}
                  className={cn(
                    "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition",
                    kind === o.v
                      ? "border-teal-300/40 bg-teal-300/10 text-teal-100"
                      : "border-white/10 bg-white/[0.03] text-slate-300"
                  )}
                >
                  <input
                    type="radio"
                    name="phi-feedback-kind"
                    value={o.v}
                    checked={kind === o.v}
                    onChange={() => setKind(o.v)}
                    className="accent-teal-400"
                  />
                  {o.label}
                </label>
              ))}
            </fieldset>
            <div>
              <label
                htmlFor="phi-feedback-msg"
                className="mb-1.5 block text-sm font-medium text-slate-200"
              >
                {t("results.feedback.message")}
              </label>
              <Textarea
                id="phi-feedback-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[88px] border-white/15 bg-white/5 text-slate-100"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          {sent ? (
            <Button
              onClick={() => onOpenChange(false)}
              className="min-h-[44px] rounded-full bg-teal-300 font-semibold text-[#0A1220] hover:bg-teal-200"
            >
              {t("app.close")}
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={sending}
              className="min-h-[44px] rounded-full bg-teal-300 font-semibold text-[#0A1220] hover:bg-teal-200"
            >
              {t("results.feedback.submit")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- main results view ---------------- */

export function ResultsView({
  assessment,
  onCreateSummary,
  onRunAgain,
  onViewHistory,
  onFeedback,
}: {
  assessment: PredictiveHealthAssessment;
  onCreateSummary: () => void;
  onRunAgain: () => void;
  onViewHistory: () => void;
  onFeedback: (kind: string, message: string) => Promise<void>;
}) {
  const { t } = usePhiT();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({});

  const isEmergencyNow = assessment.urgency === "EMERGENCY_NOW";
  const hasAlerts = assessment.safetyAlerts.length > 0;

  /* Everything below the emergency banner. When EMERGENCY_NOW, it is hidden
     entirely; otherwise, when alerts exist, it collapses behind a details. */
  const analysisBody = (
    <div className="space-y-5">
      {!assessment.triageOnly && assessment.riskSignals.length > 0 && (
        <SectionCard
          title={t("results.signalsTitle")}
          icon={<ActivityIcon />}
        >
          <div className="space-y-4">
            {assessment.riskSignals.map((s) => (
              <SignalCard key={s.id} signal={s} />
            ))}
          </div>
        </SectionCard>
      )}

      {assessment.triageOnly && (
        <div className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4">
          <p className="text-sm leading-relaxed text-amber-100">
            {t("results.triageOnlyNote")}
          </p>
        </div>
      )}

      {!assessment.triageOnly && assessment.possiblePatterns.length > 0 && (
        <SectionCard title={t("results.patternsTitle")} icon={<Sparkles className="h-4.5 w-4.5 text-teal-300" />}>
          <div className="space-y-4">
            {assessment.possiblePatterns.map((p) => (
              <PatternCard key={p.id} pattern={p} />
            ))}
          </div>
        </SectionCard>
      )}

      {!assessment.triageOnly && (
        <SectionCard>
          <div className="grid gap-6 sm:grid-cols-2">
            <FactorChips
              title={t("results.factorsContributing")}
              items={assessment.contributingFactors}
              positive={false}
            />
            <FactorChips
              title={t("results.factorsProtective")}
              items={assessment.protectiveFactors}
              positive={true}
            />
          </div>
        </SectionCard>
      )}

      {!assessment.triageOnly && assessment.missingInformation.length > 0 && (
        <SectionCard title={t("results.missingTitle")} icon={<CircleDashed className="h-4.5 w-4.5 text-slate-400" />}>
          <p className="mb-3 text-[13px] leading-relaxed text-slate-400">
            {t("results.missingIntro")}
          </p>
          <ul className="space-y-2">
            {assessment.missingInformation.map((m) => (
              <li key={m} className="flex gap-2.5 text-sm leading-relaxed text-slate-300">
                <CircleDashed aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                {m}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {!assessment.triageOnly && assessment.recommendedNextSteps.length > 0 && (
        <SectionCard title={t("results.nextTitle")} icon={<ListChecks className="h-4.5 w-4.5 text-teal-300" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            {assessment.recommendedNextSteps.map((s) => (
              <NextStepCard key={s.id} step={s} />
            ))}
          </div>
        </SectionCard>
      )}

      {!assessment.triageOnly && assessment.clinicianQuestions.length > 0 && (
        <SectionCard title={t("results.questionsTitle")} icon={<Stethoscope className="h-4.5 w-4.5 text-teal-300" />}>
          <ul className="space-y-2.5">
            {assessment.clinicianQuestions.map((q) => {
              const checked = checkedQuestions[q.id] === true;
              return (
                <li key={q.id}>
                  <label
                    className={cn(
                      "flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition",
                      checked
                        ? "border-teal-300/30 bg-teal-300/[0.06]"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) =>
                        setCheckedQuestions((prev) => ({ ...prev, [q.id]: c === true }))
                      }
                      className="mt-0.5 border-white/25"
                      aria-label={q.question}
                    />
                    <span>
                      <span
                        className={cn(
                          "block text-sm font-medium leading-snug",
                          checked ? "text-teal-200 line-through" : "text-slate-200"
                        )}
                      >
                        {q.question}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                        {q.reason}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

      {assessment.trends.length > 0 && (
        <SectionCard title={t("results.trendsTitle")} icon={<TrendingUp className="h-4.5 w-4.5 text-teal-300" />}>
          <div className="grid gap-3 sm:grid-cols-2">
            {assessment.trends.map((tr) => (
              <div
                key={tr.metric}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5"
              >
                <div className="flex items-center gap-2">
                  <TrendArrow direction={tr.direction} metric={tr.metric} />
                  <span className="text-sm font-semibold text-slate-100">{tr.label}</span>
                  <span className="text-xs text-slate-400">
                    {t(`results.trend.${tr.direction}`)}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">
                  {tr.summary}
                </p>
                <p className="mt-1.5 font-mono text-[11px] text-slate-500">
                  {t("history.trendPoints", { n: tr.dataPoints })}
                  {typeof tr.lastValue === "number"
                    ? ` · ${t("history.lastValue", { v: tr.lastValue, u: tr.unit ?? "" })}`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-20 pt-10 sm:px-6">
      <div className="space-y-5">
        {/* 1 — SAFETY FIRST, always rendered before anything else */}
        {hasAlerts && (
          <div className="space-y-4">
            {assessment.safetyAlerts.map((a) => (
              <EmergencyBanner key={a.ruleId} alert={a} />
            ))}
          </div>
        )}

        {/* 2 — urgency */}
        <UrgencyBanner
          urgency={assessment.urgency}
          label={t(`results.urgency.${assessment.urgency}`)}
        />

        {assessment.followUpIntervalDays !== null && (
          <p className="text-[13px] text-slate-400">
            {t("results.followUp", { n: assessment.followUpIntervalDays })}
          </p>
        )}

        {assessment.routingNotice && (
          <div
            role="note"
            className="rounded-2xl border border-white/15 bg-white/[0.04] p-4"
          >
            <p className="text-sm leading-relaxed text-slate-300">
              <span className="mr-2 font-semibold text-slate-100">
                {t("results.routingNoticeTitle")}
              </span>
              {assessment.routingNotice}
            </p>
          </div>
        )}

        {/* 3 — DEMO posture + version stamps */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <DemoBadge label={t("landing.demoBadge")} />
          <p className="font-mono text-[11px] text-slate-500">
            {t("results.versionLine", {
              engine: `${assessment.engineVersion}`,
              ruleset: `${assessment.rulesetId} ${assessment.rulesetVersion}`,
              content: assessment.contentVersion,
            })}
          </p>
        </div>

        <p className="text-[13px] text-slate-400">
          {t("results.completeness", { n: assessment.dataCompleteness })}
        </p>

        {/* 4-10 — analysis; position locked by construction */}
        {isEmergencyNow ? (
          /* Hidden entirely — safety information IS the result. */
          <></>
        ) : hasAlerts ? (
          <details className="group rounded-2xl border border-white/10 bg-white/[0.03]">
            <summary className="flex min-h-[52px] cursor-pointer items-center gap-2.5 px-5 py-4 text-sm font-semibold text-slate-200 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300">
              <Flag aria-hidden="true" className="h-4 w-4 text-teal-300" />
              {t("results.safetyBehind")}
            </summary>
            <div className="border-t border-white/10 p-4 sm:p-5">{analysisBody}</div>
          </details>
        ) : (
          analysisBody
        )}

        {/* 11 — disclaimer + actions */}
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <p className="text-[13px] leading-relaxed text-slate-400">
            {assessment.disclaimer}
          </p>
          <p className="text-xs leading-relaxed text-slate-500">{t("footer.emergency")}</p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <Button
              type="button"
              onClick={onViewHistory}
              className="min-h-[44px] rounded-full bg-teal-300 font-semibold text-[#0A1220] hover:bg-teal-200"
            >
              <ClipboardList aria-hidden="true" className="h-4 w-4" />
              {t("results.actions.save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCreateSummary}
              className="min-h-[44px] rounded-full border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
            >
              <FileText aria-hidden="true" className="h-4 w-4" />
              {t("results.actions.summary")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onRunAgain}
              className="min-h-[44px] rounded-full border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
            >
              <RefreshCcw aria-hidden="true" className="h-4 w-4" />
              {t("results.actions.rerun")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFeedbackOpen(true)}
              className="min-h-[44px] rounded-full text-slate-400 hover:bg-white/5 hover:text-slate-200"
            >
              {t("results.actions.report")}
            </Button>
          </div>
          <p className="text-xs text-slate-500">{t("results.actions.savedNote")}</p>
        </div>
      </div>

      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        onSubmit={onFeedback}
      />
    </div>
  );
}

function ActivityIcon() {
  return <CheckCircle2 aria-hidden="true" className="h-4.5 w-4.5 text-teal-300" />;
}
