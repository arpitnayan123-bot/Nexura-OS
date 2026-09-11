/* ============================================================
 * PHI — settings: consent management, language, reminder prefs
 * (local, demo), data export, data deletion, audit trail.
 * ============================================================ */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BellOff,
  Download,
  FileClock,
  Languages,
  Loader2,
  PauseCircle,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConsentScope } from "@/modules/phi/contracts";
import { CONSENT_SCOPES } from "@/modules/phi/contracts";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PHI_EXPORT_URL,
  deleteAllData,
  getAudit,
  putConsent,
  PhiApiError,
  type PhiAuditEntry,
  type PhiStatusPayload,
} from "./api-client";
import { CalmError, SectionCard, usePhiT } from "./ui-primitives";
import type { ConsentState } from "@/modules/phi/contracts";

const NOTIFY_KEY = "phi_notify_prefs";
type NotifyPrefs = { quietHours: string; frequency: string };
const DEFAULT_NOTIFY: NotifyPrefs = { quietHours: "22:00-06:00", frequency: "weekly" };

function readNotify(): NotifyPrefs {
  try {
    const raw = window.localStorage.getItem(NOTIFY_KEY);
    if (!raw) return DEFAULT_NOTIFY;
    const parsed = JSON.parse(raw) as Partial<NotifyPrefs>;
    return {
      quietHours: typeof parsed.quietHours === "string" ? parsed.quietHours : DEFAULT_NOTIFY.quietHours,
      frequency: typeof parsed.frequency === "string" ? parsed.frequency : DEFAULT_NOTIFY.frequency,
    };
  } catch {
    return DEFAULT_NOTIFY;
  }
}

export function SettingsView({
  consent,
  onConsentUpdated,
  status,
  onDataDeleted,
  onSetLang,
  lang,
}: {
  consent: ConsentState | null;
  onConsentUpdated: (state: ConsentState) => void;
  status: PhiStatusPayload | null;
  onDataDeleted: () => void;
  onSetLang: (lang: "en" | "hi") => void;
  lang: "en" | "hi";
}) {
  const { t } = usePhiT();
  const [busyScope, setBusyScope] = useState<string | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [notify, setNotify] = useState<NotifyPrefs>(DEFAULT_NOTIFY);
  const [notifyLoaded, setNotifyLoaded] = useState(false);

  const [audit, setAudit] = useState<PhiAuditEntry[] | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setNotify(readNotify());
    setNotifyLoaded(true);
  }, []);

  const updateNotify = (patch: Partial<NotifyPrefs>) => {
    setNotify((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(NOTIFY_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — prefs simply won't persist */
      }
      return next;
    });
  };

  const loadAudit = useCallback(async () => {
    setAuditError(null);
    try {
      setAudit(await getAudit());
    } catch (err) {
      setAuditError(err instanceof PhiApiError ? err.message : "Unexpected error");
    }
  }, []);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const toggleScope = async (scope: ConsentScope, granted: boolean) => {
    setBusyScope(scope);
    setConsentError(null);
    try {
      const state = await putConsent(scope, granted);
      onConsentUpdated(state);
    } catch (err) {
      setConsentError(err instanceof PhiApiError ? err.message : "Unexpected error");
    } finally {
      setBusyScope(null);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAllData();
      setConfirmOpen(false);
      onDataDeleted();
    } catch (err) {
      setDeleteError(err instanceof PhiApiError ? err.message : "Unexpected error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-20 pt-10 sm:px-6">
      <header>
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-white">
          <SettingsIcon aria-hidden="true" className="h-6 w-6 text-teal-300" />
          {t("settings.title")}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{t("settings.intro")}</p>
      </header>

      {status?.killSwitch && (
        <div className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4" role="alert">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-100">
            <PauseCircle aria-hidden="true" className="h-4 w-4" />
            {t("app.killSwitchTitle")}
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-amber-100/90">
            {t("app.killSwitchBody")}
          </p>
        </div>
      )}

      {/* Consent */}
      <SectionCard
        title={t("settings.consentTitle")}
        icon={<ShieldCheck aria-hidden="true" className="h-4.5 w-4.5 text-teal-300" />}
      >
        <p className="mb-4 text-[13px] leading-relaxed text-slate-400">
          {t("settings.consentNote")}
        </p>
        {consentError && (
          <p role="alert" className="mb-3 text-[13px] text-amber-200">
            {consentError}
          </p>
        )}
        <ul className="space-y-2.5">
          {CONSENT_SCOPES.map((scope) => {
            const id = `set-${scope}`;
            const granted = consent?.scopes?.[scope] === true;
            return (
              <li
                key={scope}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3.5",
                  granted
                    ? "border-teal-300/25 bg-teal-300/[0.06]"
                    : "border-white/10 bg-white/[0.03]"
                )}
              >
                <Switch
                  id={id}
                  checked={granted}
                  disabled={busyScope === scope || !consent}
                  onCheckedChange={(c) => void toggleScope(scope, c === true)}
                  aria-label={scope}
                  className="mt-0.5 data-[state=checked]:bg-teal-400"
                />
                <label htmlFor={id} className="min-w-0 cursor-pointer">
                  <span className="block text-sm font-medium leading-snug text-slate-100">
                    {t(`consent.scope.${scope}`)}
                  </span>
                  <span className="mt-0.5 block font-mono text-[11px] text-slate-500">
                    {scope}
                    {busyScope === scope ? " · …" : ""}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      {/* Language */}
      <SectionCard
        title={t("settings.languageTitle")}
        icon={<Languages aria-hidden="true" className="h-4.5 w-4.5 text-teal-300" />}
      >
        <div
          role="radiogroup"
          aria-label={t("app.langLabel")}
          className="grid max-w-sm grid-cols-2 gap-2"
        >
          {(
            [
              { v: "en", label: t("app.langEn") },
              { v: "hi", label: t("app.langHi") },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              type="button"
              role="radio"
              aria-checked={lang === o.v}
              onClick={() => onSetLang(o.v)}
              className={cn(
                "min-h-[44px] rounded-xl border px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300",
                lang === o.v
                  ? "border-teal-300/50 bg-teal-300/15 text-teal-100"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Notifications (local demo) */}
      <SectionCard
        title={t("settings.notificationsTitle")}
        icon={<BellOff aria-hidden="true" className="h-4.5 w-4.5 text-teal-300" />}
      >
        <p className="mb-4 text-[13px] leading-relaxed text-slate-400">
          {t("settings.notificationsDemoNote")}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="phi-quiet"
              className="mb-1.5 block text-sm font-medium text-slate-200"
            >
              {t("settings.quietHours")}
            </label>
            <select
              id="phi-quiet"
              value={notify.quietHours}
              onChange={(e) => updateNotify({ quietHours: e.target.value })}
              disabled={!notifyLoaded}
              className="h-11 w-full rounded-md border border-white/15 bg-white/5 px-3 text-sm text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
            >
              <option value="off">—</option>
              <option value="21:00-06:00">21:00 – 06:00</option>
              <option value="22:00-06:00">22:00 – 06:00</option>
              <option value="22:00-07:00">22:00 – 07:00</option>
              <option value="23:00-07:00">23:00 – 07:00</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="phi-freq"
              className="mb-1.5 block text-sm font-medium text-slate-200"
            >
              {t("settings.frequency")}
            </label>
            <select
              id="phi-freq"
              value={notify.frequency}
              onChange={(e) => updateNotify({ frequency: e.target.value })}
              disabled={!notifyLoaded}
              className="h-11 w-full rounded-md border border-white/15 bg-white/5 px-3 text-sm text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
            >
              <option value="weekly">{t("settings.freq.weekly")}</option>
              <option value="fortnight">{t("settings.freq.fortnight")}</option>
              <option value="monthly">{t("settings.freq.monthly")}</option>
              <option value="never">{t("settings.freq.never")}</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {/* Data rights */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard title={t("settings.exportTitle")} icon={<Download aria-hidden="true" className="h-4.5 w-4.5 text-teal-300" />}>
          <p className="mb-4 text-[13px] leading-relaxed text-slate-400">
            {t("settings.exportDesc")}
          </p>
          <a
            href={PHI_EXPORT_URL}
            download
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-teal-300/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            {t("settings.exportBtn")}
          </a>
        </SectionCard>

        <SectionCard title={t("settings.deleteTitle")} icon={<Trash2 aria-hidden="true" className="h-4.5 w-4.5 text-amber-300" />}>
          <p className="mb-4 text-[13px] leading-relaxed text-slate-400">
            {t("settings.deleteDesc")}
          </p>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-amber-300/40 bg-amber-300/10 px-5 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            {t("settings.deleteBtn")}
          </button>
          {deleteError && (
            <p role="alert" className="mt-3 text-[13px] text-amber-200">
              {deleteError}
            </p>
          )}
        </SectionCard>
      </div>

      {/* Audit trail */}
      <SectionCard
        title={t("settings.auditTitle")}
        icon={<FileClock aria-hidden="true" className="h-4.5 w-4.5 text-teal-300" />}
      >
        <p className="mb-4 text-[13px] leading-relaxed text-slate-400">
          {t("settings.auditIntro")}
        </p>
        {auditError && (
          <CalmError
            title={t("app.errorTitle")}
            body={auditError}
            onRetry={loadAudit}
            retryLabel={t("app.retry")}
          />
        )}
        {audit === null && !auditError && (
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-teal-300" />
        )}
        {audit !== null && audit.length === 0 && (
          <p className="text-sm text-slate-500">{t("settings.auditEmpty")}</p>
        )}
        {audit !== null && audit.length > 0 && (
          <ol className="relative space-y-4 border-l border-white/10 pl-5">
            {audit.slice(0, 30).map((entry, i) => (
              <li key={entry.id ?? `${entry.action}-${i}`} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-[26px] top-1.5 size-2.5 rounded-full border-2 border-[#0A1220] bg-teal-300/80"
                />
                <p className="font-mono text-[13px] text-slate-200">{entry.action}</p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                  {(() => {
                    try {
                      return new Date(entry.createdAt ?? "").toLocaleString(
                        lang === "hi" ? "hi-IN" : "en-IN",
                        { dateStyle: "medium", timeStyle: "short" }
                      );
                    } catch {
                      return entry.createdAt ?? "";
                    }
                  })()}
                  {entry.outcome ? ` · ${entry.outcome}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>

      {/* Delete confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="border-white/15 bg-[#0E1830] text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white">
              {t("settings.deleteConfirmTitle")}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {t("settings.deleteConfirmBody")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
            >
              {t("settings.deleteConfirmCancel")}
            </button>
            <button
              type="button"
              onClick={doDelete}
              disabled={deleting}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-amber-300 px-5 py-2.5 text-sm font-bold text-[#2A1A05] transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              {deleting && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
              {t("settings.deleteConfirmCta")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
