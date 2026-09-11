/* ============================================================
 * PHI — clinician summary + share-link controls
 * The FULL summary is always visible to the user here. A share
 * link only ever carries sections from the API allow-list
 * (detectedSignals, missingInformation, questionsToAsk,
 * recentVitals, medications, allergies, lifestyleContext) that
 * the user ticked. Links are time-limited (7 days) and
 * revocable. The consent note is always visible.
 * ============================================================ */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, FileText, Link2, Loader2, RefreshCcw, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClinicianSummary, PredictiveHealthAssessment } from "@/modules/phi/contracts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createShareLink,
  createSummary,
  revokeShareLink,
  PhiApiError,
} from "./api-client";
import { CalmError, SectionCard, usePhiT } from "./ui-primitives";

type SummarySectionKey =
  | "statement"
  | "mainSymptoms"
  | "onsetAndDuration"
  | "progression"
  | "relevantHistory"
  | "medications"
  | "allergies"
  | "recentVitals"
  | "relevantLabs"
  | "lifestyleContext"
  | "detectedSignals"
  | "missingInformation"
  | "questionsToAsk";

const SECTION_KEYS: SummarySectionKey[] = [
  "statement",
  "mainSymptoms",
  "onsetAndDuration",
  "progression",
  "relevantHistory",
  "medications",
  "allergies",
  "recentVitals",
  "relevantLabs",
  "lifestyleContext",
  "detectedSignals",
  "missingInformation",
  "questionsToAsk",
];

/** The ONLY sections the share endpoint accepts — keep in sync with the API. */
const SHAREABLE_KEYS = [
  "detectedSignals",
  "missingInformation",
  "questionsToAsk",
  "recentVitals",
  "medications",
  "allergies",
  "lifestyleContext",
] as const;
type ShareableKey = (typeof SHAREABLE_KEYS)[number];

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function summarySectionLines(
  summary: ClinicianSummary,
  key: SummarySectionKey
): string[] {
  const raw: unknown = summary[key];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string" && raw.length > 0) return [raw];
  return [];
}

export function SummaryShareView({
  assessment,
  lang,
}: {
  assessment: PredictiveHealthAssessment;
  lang: "en" | "hi";
}) {
  const { t } = usePhiT();
  const [summary, setSummary] = useState<ClinicianSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [included, setIncluded] = useState<Record<ShareableKey, boolean>>(
    () =>
      Object.fromEntries(SHAREABLE_KEYS.map((k) => [k, true])) as Record<
        ShareableKey,
        boolean
      >
  );

  const [creating, setCreating] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [share, setShare] = useState<{ token: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revoked, setRevoked] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await createSummary(assessment.id);
      setSummary(data);
    } catch (err) {
      setError(
        err instanceof PhiApiError ? `${err.message}` : "Unexpected error"
      );
    } finally {
      setLoading(false);
    }
  }, [assessment.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  const shareUrl = useMemo(
    () => (share ? `/api/nx/phi/share?token=${encodeURIComponent(share.token)}` : null),
    [share]
  );

  const tickedShareable = SHAREABLE_KEYS.filter((k) => included[k]);

  const createLink = async () => {
    if (tickedShareable.length === 0) return;
    setCreating(true);
    setShareError(null);
    try {
      const result = await createShareLink({
        includes: tickedShareable,
        dateFrom: assessment.inputDataRange?.from ?? undefined,
        dateTo: assessment.inputDataRange?.to ?? undefined,
        expiresInDays: 7,
      });
      setShare(result);
      setRevoked(false);
      setCopied(false);
    } catch (err) {
      setShareError(
        err instanceof PhiApiError ? err.message : "Unexpected error"
      );
    } finally {
      setCreating(false);
    }
  };

  const revoke = async () => {
    if (!share) return;
    setRevoking(true);
    try {
      await revokeShareLink(share.token);
      setRevoked(true);
      setShare(null);
    } catch (err) {
      setShareError(
        err instanceof PhiApiError ? err.message : "Unexpected error"
      );
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-4xl items-center justify-center px-4 sm:px-6">
        <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-teal-300" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-10 sm:px-6">
        <CalmError
          title={t("app.errorTitle")}
          body={error ?? t("summary.notFound")}
          onRetry={load}
          retryLabel={t("app.retry")}
        />
      </div>
    );
  }

  const generatedLabel = (() => {
    try {
      return new Date(summary.generatedAt).toLocaleString(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return summary.generatedAt;
    }
  })();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 pb-20 pt-10 sm:px-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-white">
          <FileText aria-hidden="true" className="h-6 w-6 text-teal-300" />
          {t("summary.title")}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{t("summary.intro")}</p>
        <p className="mt-2 font-mono text-[11px] text-slate-500">
          {t("summary.generatedAt", { when: generatedLabel })} · {assessment.id}
        </p>
      </header>

      {/* Full summary — always visible to the user, in full */}
      <SectionCard title={t("summary.fullTitle")}>
        <p className="mb-4 text-[13px] leading-relaxed text-slate-400">
          {t(
            "summary.dateRangeNote",
            {
              from: assessment.inputDataRange?.from ?? "—",
              to: assessment.inputDataRange?.to ?? "—",
            }
          )}
        </p>
        <div className="space-y-4">
          {SECTION_KEYS.map((key) => {
            const lines = summarySectionLines(summary, key);
            return (
              <div
                key={key}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5"
              >
                <h3 className="text-sm font-semibold text-slate-100">
                  {t(`summary.section.${key}`)}
                </h3>
                {lines.length > 0 ? (
                  <ul className="mt-1.5 space-y-1">
                    {lines.map((line, i) => (
                      <li
                        key={`${key}-${i}`}
                        className="text-[13px] leading-relaxed text-slate-300"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    {t("review.noneRecorded")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Share — only ticked, allow-listed sections ever leave the app */}
      <SectionCard
        title={t("summary.linkLabel")}
        icon={<Link2 aria-hidden="true" className="h-4.5 w-4.5 text-teal-300" />}
      >
        <p className="mb-4 text-[13px] leading-relaxed text-amber-200/90">
          {t("summary.consentNote")}
        </p>

        <h3 className="mb-2.5 text-sm font-semibold text-slate-200">
          {t("summary.includes")}
        </h3>
        <div className="space-y-2.5">
          {SHAREABLE_KEYS.map((key) => {
            const checked = included[key];
            const lines = summarySectionLines(summary, key);
            return (
              <label
                key={key}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition",
                  checked
                    ? "border-teal-300/25 bg-teal-300/[0.05]"
                    : "border-white/10 bg-white/[0.03]"
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) =>
                    setIncluded((prev) => ({ ...prev, [key]: c === true }))
                  }
                  className="mt-0.5 border-white/25"
                  aria-label={t(`summary.section.${key}`)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-100">
                    {t(`summary.section.${key}`)}
                  </span>
                  {lines.length > 0 ? (
                    <span className="mt-1 block text-xs leading-relaxed text-slate-400">
                      {t("summary.sectionPreview", { n: lines.length })}
                    </span>
                  ) : (
                    <span className="mt-1 block text-xs text-slate-500">
                      {t("review.noneRecorded")}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>

        {shareError && (
          <p role="alert" className="mt-3 text-[13px] leading-relaxed text-amber-200">
            {shareError}
          </p>
        )}

        {!share ? (
          <div className="mt-4 space-y-3">
            <Button
              type="button"
              onClick={createLink}
              disabled={creating || tickedShareable.length === 0}
              className="min-h-[48px] w-full rounded-full bg-teal-300 font-semibold text-[#0A1220] hover:bg-teal-200 sm:w-auto"
            >
              {creating ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 aria-hidden="true" className="h-4 w-4" />
              )}
              {creating ? t("summary.creating") : t("summary.createLink")}
            </Button>
            {tickedShareable.length === 0 && (
              <p className="text-[13px] text-amber-200/90">{t("summary.needOne")}</p>
            )}
            {revoked && (
              <p className="flex items-center gap-2 text-[13px] text-teal-200">
                <ShieldOff aria-hidden="true" className="h-4 w-4" />
                {t("summary.revoked")}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 font-mono text-[12px] text-teal-100">
                {shareUrl}
              </code>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  if (!shareUrl) return;
                  const ok = await copyText(shareUrl);
                  setCopied(ok);
                }}
                className="min-h-[44px] shrink-0 rounded-full border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
              >
                {copied ? (
                  <Check aria-hidden="true" className="h-4 w-4 text-teal-300" />
                ) : (
                  <Copy aria-hidden="true" className="h-4 w-4" />
                )}
                {copied ? t("summary.copied") : t("summary.copy")}
              </Button>
            </div>
            <p className="font-mono text-[11px] text-slate-500">
              {(() => {
                try {
                  return t("summary.expires", {
                    when: new Date(share.expiresAt).toLocaleString(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                  });
                } catch {
                  return t("summary.expires", { when: share.expiresAt });
                }
              })()}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={revoke}
              disabled={revoking}
              className="min-h-[44px] rounded-full border-amber-300/40 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20"
            >
              {revoking ? (
                <RefreshCcw aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldOff aria-hidden="true" className="h-4 w-4" />
              )}
              {t("summary.revoke")}
            </Button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
