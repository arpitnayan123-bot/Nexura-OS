/* ============================================================
 * PHI — history view: past assessments + trends
 * ============================================================ */

"use client";

import { ChevronRight, History, Inbox, Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrendObservation } from "@/modules/phi/contracts";
import { SectionCard, usePhiT } from "./ui-primitives";
import type { PhiHistoryItem } from "./api-client";

function formatWhen(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function HistoryView({
  items,
  trends,
  onOpen,
  lang,
  loading,
}: {
  items: PhiHistoryItem[];
  trends: TrendObservation[];
  onOpen: (id: string) => void;
  lang: "en" | "hi";
  loading?: boolean;
}) {
  const { t } = usePhiT();
  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  const maxPoints = Math.max(1, ...trends.map((tr) => tr.dataPoints));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 pb-20 pt-10 sm:px-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-white">
          <History aria-hidden="true" className="h-6 w-6 text-teal-300" />
          {t("history.title")}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{t("history.intro")}</p>
      </header>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-slate-400" role="status">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-teal-300" />
          {t("app.loading")}
        </p>
      )}

      {trends.length > 0 && (
        <SectionCard
          title={t("history.trendsTitle")}
          icon={<TrendingUp aria-hidden="true" className="h-4.5 w-4.5 text-teal-300" />}
        >
          <p className="mb-4 text-[13px] leading-relaxed text-slate-400">
            {t("history.trendsIntro")}
          </p>
          <div className="space-y-3">
            {trends.map((tr) => (
              <div
                key={tr.metric}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-100">{tr.label}</span>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                      tr.direction === "improving"
                        ? "border-teal-300/30 bg-teal-300/10 text-teal-200"
                        : tr.direction === "deteriorating"
                          ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
                          : "border-white/10 bg-white/5 text-slate-400"
                    )}
                  >
                    {t(`results.trend.${tr.direction}`)}
                  </span>
                </div>
                {/* simple honest bar: how many entries back the trend reaches */}
                <div
                  className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
                  role="presentation"
                >
                  <div
                    className={cn(
                      "h-full rounded-full",
                      tr.direction === "deteriorating" ? "bg-amber-300/70" : "bg-teal-300/70"
                    )}
                    style={{ width: `${Math.max(6, (tr.dataPoints / maxPoints) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{tr.summary}</p>
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

      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <Inbox aria-hidden="true" className="mx-auto h-6 w-6 text-slate-500" />
          <p className="mt-3 text-sm text-slate-400">{t("history.empty")}</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
          <h2 className="px-4 pt-4 text-base font-semibold tracking-tight text-white sm:px-6 sm:pt-5">
            {t("history.date")}
          </h2>
          <ul className="mt-3 divide-y divide-white/[0.06] border-t border-white/[0.06]">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-300 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">
                      {formatWhen(item.createdAt, locale)}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                      {t("results.completeness", { n: item.dataCompleteness })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                        item.urgency === "EMERGENCY_NOW" ||
                          item.urgency === "SAME_DAY_MEDICAL_REVIEW"
                          ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
                          : "border-teal-300/30 bg-teal-300/10 text-teal-200"
                      )}
                    >
                      {urgencyLabel(t, item.urgency)}
                    </span>
                    <ChevronRight aria-hidden="true" className="h-4 w-4 text-slate-500" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Compact urgency chip reused in other views. */
export function UrgencyChip({ urgency }: { urgency: string }) {
  const { t } = usePhiT();
  return (
    <span className="rounded-full border border-teal-300/30 bg-teal-300/10 px-2.5 py-0.5 text-[11px] font-semibold text-teal-200">
      {urgencyLabel(t, urgency)}
    </span>
  );
}

/** Falls back to the raw enum when a label is missing (never a raw key). */
function urgencyLabel(
  t: (key: string) => string,
  urgency: string
): string {
  const label = t(`results.urgency.${urgency}`);
  return label.startsWith("results.urgency.") ? urgency.replace(/_/g, " ") : label;
}
