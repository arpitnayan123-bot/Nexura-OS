/* ============================================================
 * PHI — intake step forms (consent → profile → symptoms →
 * conditions/meds/allergies → lifestyle → vitals → review)
 * Every field carries a short "why we ask" explanation.
 * Mental-health / self-harm categories render a calm support
 * notice (Tele-MANAS 14416, 108) BEFORE continue is allowed.
 * ============================================================ */

"use client";

import { useId, useState } from "react";
import {
  BadgeCheck,
  HeartHandshake,
  ListChecks,
  PencilLine,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ConsentScope } from "@/modules/phi/contracts";
import { CONSENT_SCOPES } from "@/modules/phi/contracts";
import type { PhiSexAtBirth } from "./api-client";
import { usePhiT } from "./ui-primitives";
import { FieldLabel, SaveStateChip, SkipNote } from "./ui-primitives";

/* ---------------- Shared intake form types ---------------- */

export type ProfileForm = {
  ageYears: string;
  sexAtBirth: "" | PhiSexAtBirth;
  pregnancyPossibility: boolean;
  heightCm: string;
  weightKg: string;
  waistCm: string;
  languagePref: "en" | "hi";
  activityLevel: string;
  occupation: string;
  shiftWork: boolean;
  accessibilityNotes: string;
};

export type SymptomForm = {
  localId: string;
  category: string;
  severity: number;
  onset: "today" | "fewDays" | "overWeek" | "overMonth";
  isNew: boolean;
  isWorsening: boolean;
  associated: string[];
  associatedDraft: string;
  freeText: string;
  /** Calm notice acknowledged? Required for mental_health / self_harm. */
  mhAck: boolean;
};

export type ConditionRow = { localId: string; name: string; status: string };
export type MedicationRow = {
  localId: string;
  name: string;
  strength: string;
  frequency: string;
};
export type AllergyRow = {
  localId: string;
  substance: string;
  reaction: string;
};

export type ConditionsForm = {
  conditions: ConditionRow[];
  medications: MedicationRow[];
  allergies: AllergyRow[];
};

export type LifestyleForm = {
  dietaryPref: string;
  cuisine: string;
  sleepHours: string;
  sleepQuality: string;
  activityMinutes: string;
  fruitsVeg: string;
  tobacco: string;
  alcohol: string;
  stress: string;
  waterGlasses: string;
};

export type VitalsForm = {
  bp: string; // "120/80"
  pulse: string;
  temperature: string;
  tempUnit: "C" | "F";
  spo2: string;
  glucose: string;
  glucoseUnit: "mgdl" | "mmol";
  weightKg: string;
  atRest: boolean;
  confidence: "sure" | "unsure";
};

export const SYMPTOM_CATEGORIES = [
  "general",
  "fever",
  "headache",
  "chest_pain",
  "breathing",
  "abdominal_pain",
  "neurological",
  "bleeding",
  "allergic_reaction",
  "dehydration",
  "vomiting",
  "mental_health",
  "self_harm",
] as const;

export const MENTAL_HEALTH_CATEGORIES = new Set(["mental_health", "self_harm"]);

export const ONSET_OPTIONS = [
  { value: "today", days: 1 },
  { value: "fewDays", days: 3 },
  { value: "overWeek", days: 10 },
  { value: "overMonth", days: 35 },
] as const;

export function severityBand(n: number): "mild" | "noticeable" | "severe" {
  if (n <= 3) return "mild";
  if (n <= 6) return "noticeable";
  return "severe";
}

export function severityBandLabelKey(band: string): string {
  return band === "mild"
    ? "symptoms.severityMild"
    : band === "noticeable"
      ? "symptoms.severityNoticeable"
      : "symptoms.severitySevere";
}

let localIdCounter = 0;
export function nextLocalId(prefix: string): string {
  localIdCounter += 1;
  return `${prefix}-${Date.now()}-${localIdCounter}`;
}

type SaveState = "idle" | "saving" | "saved" | "error";

function StepHeader({
  title,
  intro,
  saveState,
  onRetry,
}: {
  title: string;
  intro?: string;
  saveState?: SaveState;
  onRetry?: () => void;
}) {
  const { t } = usePhiT();
  return (
    <div className="mb-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
        {saveState && onRetry && (
          <SaveStateChip
            state={saveState}
            savingLabel={t("app.saving")}
            savedLabel={t("app.saved")}
            retryLabel={t("app.notSaved")}
            onRetry={onRetry}
          />
        )}
      </div>
      {intro && <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{intro}</p>}
    </div>
  );
}

/* ================= CONSENT ================= */

export function ConsentStep({
  scopes,
  onToggle,
  onBulk,
}: {
  scopes: Record<string, boolean>;
  onToggle: (scope: ConsentScope, granted: boolean) => void;
  onBulk: (granted: boolean) => void;
}) {
  const { t } = usePhiT();
  return (
    <div>
      <StepHeader title={t("consent.title")} intro={t("consent.intro")} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onBulk(true)}
          className="min-h-[44px] rounded-full border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
        >
          {t("consent.turnOnAll")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onBulk(false)}
          className="min-h-[44px] rounded-full border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
        >
          {t("consent.turnOffAll")}
        </Button>
      </div>
      <ul className="space-y-2.5">
        {CONSENT_SCOPES.map((scope) => {
          const id = `consent-${scope}`;
          const granted = scopes[scope] === true;
          return (
            <li
              key={scope}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3.5 transition-colors",
                granted
                  ? "border-teal-300/25 bg-teal-300/[0.06]"
                  : "border-white/10 bg-white/[0.03]"
              )}
            >
              <Switch
                id={id}
                checked={granted}
                onCheckedChange={(checked) => onToggle(scope, checked === true)}
                aria-label={scope}
                className="mt-0.5 data-[state=checked]:bg-teal-400"
              />
              <div className="min-w-0">
                <label
                  htmlFor={id}
                  className="cursor-pointer text-sm font-medium text-slate-100"
                >
                  {t(`consent.scope.${scope}`)}
                </label>
                <p className="mt-0.5 font-mono text-[11px] text-slate-500">{scope}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4">
        <SkipNote>{t("consent.requiredNote")}</SkipNote>
      </div>
    </div>
  );
}

/* ================= PROFILE ================= */

export function ProfileStep({
  value,
  onChange,
  saveState,
  onRetry,
}: {
  value: ProfileForm;
  onChange: (patch: Partial<ProfileForm>) => void;
  saveState: SaveState;
  onRetry: () => void;
}) {
  const { t } = usePhiT();
  const age = Number.parseInt(value.ageYears, 10);
  const minor = Number.isFinite(age) && age > 0 && age < 18;
  const ageId = useId();

  return (
    <div>
      <StepHeader
        title={t("profile.title")}
        intro={t("profile.intro")}
        saveState={saveState}
        onRetry={onRetry}
      />
      {minor && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4"
        >
          <p className="text-sm font-medium leading-relaxed text-amber-100">
            {t("profile.adultsOnly")}
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor={ageId} why={t("profile.ageWhy")} required>
            {t("profile.age")}
          </FieldLabel>
          <Input
            id={ageId}
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            value={value.ageYears}
            onChange={(e) => onChange({ ageYears: e.target.value })}
            className="h-11 border-white/15 bg-white/5 text-slate-100 placeholder:text-slate-500"
          />
          {!minor && !Number.isFinite(age) && (
            <p className="mt-1 text-xs text-slate-500">{t("profile.ageRequired")}</p>
          )}
        </div>
        <div>
          <FieldLabel htmlFor="phi-sex" why={t("profile.sexWhy")}>
            {t("profile.sex")}
          </FieldLabel>
          <Select
            value={value.sexAtBirth || undefined}
            onValueChange={(v) => onChange({ sexAtBirth: v as PhiSexAtBirth })}
          >
            <SelectTrigger
              id="phi-sex"
              className="h-11 w-full border-white/15 bg-white/5 text-slate-100"
            >
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#101B31] text-slate-100">
              {(["male", "female", "intersex", "undisclosed"] as const).map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`profile.sex.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 sm:col-span-2">
          <div>
            <Label htmlFor="phi-pregnancy" className="text-sm text-slate-100">
              {t("profile.pregnancy")}
            </Label>
            <p className="mt-0.5 text-xs text-slate-400">{t("profile.pregnancyWhy")}</p>
          </div>
          <Switch
            id="phi-pregnancy"
            checked={value.pregnancyPossibility}
            onCheckedChange={(c) => onChange({ pregnancyPossibility: c === true })}
            className="data-[state=checked]:bg-teal-400"
          />
        </div>
        <div>
          <FieldLabel htmlFor="phi-height">{t("profile.height")}</FieldLabel>
          <Input
            id="phi-height"
            type="number"
            inputMode="decimal"
            value={value.heightCm}
            onChange={(e) => onChange({ heightCm: e.target.value })}
            className="h-11 border-white/15 bg-white/5 text-slate-100"
          />
        </div>
        <div>
          <FieldLabel htmlFor="phi-weight">{t("profile.weight")}</FieldLabel>
          <Input
            id="phi-weight"
            type="number"
            inputMode="decimal"
            value={value.weightKg}
            onChange={(e) => onChange({ weightKg: e.target.value })}
            className="h-11 border-white/15 bg-white/5 text-slate-100"
          />
        </div>
        <div>
          <FieldLabel htmlFor="phi-waist" why={t("profile.waistWhy")}>
            {t("profile.waist")}
          </FieldLabel>
          <Input
            id="phi-waist"
            type="number"
            inputMode="decimal"
            value={value.waistCm}
            onChange={(e) => onChange({ waistCm: e.target.value })}
            className="h-11 border-white/15 bg-white/5 text-slate-100"
          />
        </div>
        <div>
          <FieldLabel htmlFor="phi-lang">{t("profile.language")}</FieldLabel>
          <Select
            value={value.languagePref}
            onValueChange={(v) => onChange({ languagePref: v === "hi" ? "hi" : "en" })}
          >
            <SelectTrigger
              id="phi-lang"
              className="h-11 w-full border-white/15 bg-white/5 text-slate-100"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#101B31] text-slate-100">
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="hi">हिंदी</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="phi-activity">{t("profile.activityLevel")}</FieldLabel>
          <Select
            value={value.activityLevel || undefined}
            onValueChange={(v) => onChange({ activityLevel: v })}
          >
            <SelectTrigger
              id="phi-activity"
              className="h-11 w-full border-white/15 bg-white/5 text-slate-100"
            >
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#101B31] text-slate-100">
              <SelectItem value="low">{t("profile.activity.low")}</SelectItem>
              <SelectItem value="moderate">{t("profile.activity.moderate")}</SelectItem>
              <SelectItem value="high">{t("profile.activity.high")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="phi-occupation">{t("profile.occupation")}</FieldLabel>
          <Input
            id="phi-occupation"
            value={value.occupation}
            onChange={(e) => onChange({ occupation: e.target.value })}
            className="h-11 border-white/15 bg-white/5 text-slate-100"
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 sm:col-span-2">
          <div>
            <Label htmlFor="phi-shift" className="text-sm text-slate-100">
              {t("profile.shiftWork")}
            </Label>
            <p className="mt-0.5 text-xs text-slate-400">{t("profile.shiftWorkWhy")}</p>
          </div>
          <Switch
            id="phi-shift"
            checked={value.shiftWork}
            onCheckedChange={(c) => onChange({ shiftWork: c === true })}
            className="data-[state=checked]:bg-teal-400"
          />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="phi-access" why={t("profile.accessibilityWhy")}>
            {t("profile.accessibility")}
          </FieldLabel>
          <Textarea
            id="phi-access"
            value={value.accessibilityNotes}
            onChange={(e) => onChange({ accessibilityNotes: e.target.value })}
            className="min-h-[72px] border-white/15 bg-white/5 text-slate-100"
          />
        </div>
      </div>
    </div>
  );
}

/* ================= SYMPTOMS ================= */

export function SymptomsStep({
  value,
  onChange,
  saveState,
  onRetry,
}: {
  value: SymptomForm[];
  onChange: (list: SymptomForm[]) => void;
  saveState: SaveState;
  onRetry: () => void;
}) {
  const { t } = usePhiT();
  const patch = (localId: string, p: Partial<SymptomForm>) =>
    onChange(value.map((s) => (s.localId === localId ? { ...s, ...p } : s)));

  const addSymptom = () =>
    onChange([
      ...value,
      {
        localId: nextLocalId("sym"),
        category: "general",
        severity: 3,
        onset: "today",
        isNew: true,
        isWorsening: false,
        associated: [],
        associatedDraft: "",
        freeText: "",
        mhAck: false,
      },
    ]);

  return (
    <div>
      <StepHeader
        title={t("symptoms.title")}
        intro={t("symptoms.intro")}
        saveState={saveState}
        onRetry={onRetry}
      />
      {value.length === 0 && <SkipNote>{t("symptoms.emptyHint")}</SkipNote>}
      <div className="space-y-5">
        {value.map((sym, idx) => {
          const needsNotice = MENTAL_HEALTH_CATEGORIES.has(sym.category);
          return (
            <div
              key={sym.localId}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-widest text-slate-500">
                  #{idx + 1}
                </span>
                {value.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange(value.filter((s) => s.localId !== sym.localId))
                    }
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-2.5 text-xs text-slate-400 transition hover:text-rose-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    {t("symptoms.remove")}
                  </button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor={`sym-cat-${sym.localId}`}>
                    {t("symptoms.category")}
                  </FieldLabel>
                  <Select
                    value={sym.category}
                    onValueChange={(v) => patch(sym.localId, { category: v })}
                  >
                    <SelectTrigger
                      id={`sym-cat-${sym.localId}`}
                      className="h-11 w-full border-white/15 bg-white/5 text-slate-100"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#101B31] text-slate-100">
                      {SYMPTOM_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`symptoms.cat.${c}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor={`sym-onset-${sym.localId}`}>
                    {t("symptoms.onset")}
                  </FieldLabel>
                  <Select
                    value={sym.onset}
                    onValueChange={(v) =>
                      patch(sym.localId, { onset: v as SymptomForm["onset"] })
                    }
                  >
                    <SelectTrigger
                      id={`sym-onset-${sym.localId}`}
                      className="h-11 w-full border-white/15 bg-white/5 text-slate-100"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#101B31] text-slate-100">
                      {ONSET_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {t(`symptoms.onset.${o.value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-5">
                <Label
                  htmlFor={`sym-sev-${sym.localId}`}
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  {t("symptoms.severity", { n: sym.severity })} ·{" "}
                  <span className="text-teal-200">
                    {t(severityBandLabelKey(severityBand(sym.severity)))}
                  </span>
                </Label>
                <Slider
                  id={`sym-sev-${sym.localId}`}
                  min={1}
                  max={10}
                  step={1}
                  value={[sym.severity]}
                  onValueChange={(vals) =>
                    patch(sym.localId, { severity: vals[0] ?? sym.severity })
                  }
                  aria-label={t("symptoms.severity", { n: sym.severity })}
                  className="[&_[data-slot=slider-range]]:bg-teal-400 [&_[data-slot=slider-thumb]]:border-teal-300"
                />
                <div
                  aria-hidden="true"
                  className="mt-1.5 flex justify-between text-[11px] text-slate-500"
                >
                  <span>1 · {t("symptoms.severityMild")}</span>
                  <span>4 · {t("symptoms.severityNoticeable")}</span>
                  <span>7+ · {t("symptoms.severitySevere")}</span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <Label
                    htmlFor={`sym-new-${sym.localId}`}
                    className="text-sm text-slate-100"
                  >
                    {t("symptoms.isNew")}
                  </Label>
                  <Switch
                    id={`sym-new-${sym.localId}`}
                    checked={sym.isNew}
                    onCheckedChange={(c) => patch(sym.localId, { isNew: c === true })}
                    className="data-[state=checked]:bg-teal-400"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <Label
                    htmlFor={`sym-worse-${sym.localId}`}
                    className="text-sm text-slate-100"
                  >
                    {t("symptoms.isWorsening")}
                  </Label>
                  <Switch
                    id={`sym-worse-${sym.localId}`}
                    checked={sym.isWorsening}
                    onCheckedChange={(c) =>
                      patch(sym.localId, { isWorsening: c === true })
                    }
                    className="data-[state=checked]:bg-teal-400"
                  />
                </div>
              </div>

              <div className="mt-4">
                <FieldLabel htmlFor={`sym-assoc-${sym.localId}`}>
                  {t("symptoms.associated")}
                </FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {sym.associated.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1.5 rounded-full border border-teal-300/30 bg-teal-300/10 px-3 py-1 text-xs text-teal-100"
                    >
                      {a}
                      <button
                        type="button"
                        aria-label={`${t("symptoms.remove")} ${a}`}
                        onClick={() =>
                          patch(sym.localId, {
                            associated: sym.associated.filter((x) => x !== a),
                          })
                        }
                        className="rounded-full text-teal-300/70 transition hover:text-teal-100 focus-visible:outline-2 focus-visible:outline-teal-300"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    id={`sym-assoc-${sym.localId}`}
                    value={sym.associatedDraft}
                    placeholder={t("symptoms.associatedPlaceholder")}
                    onChange={(e) =>
                      patch(sym.localId, { associatedDraft: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const draft = sym.associatedDraft.trim();
                        if (draft && !sym.associated.includes(draft)) {
                          patch(sym.localId, {
                            associated: [...sym.associated, draft],
                            associatedDraft: "",
                          });
                        }
                      }
                    }}
                    className="h-10 border-white/15 bg-white/5 text-slate-100 placeholder:text-slate-500"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const draft = sym.associatedDraft.trim();
                      if (draft && !sym.associated.includes(draft)) {
                        patch(sym.localId, {
                          associated: [...sym.associated, draft],
                          associatedDraft: "",
                        });
                      }
                    }}
                    className="min-h-[40px] rounded-lg border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                  >
                    {t("symptoms.associatedAdd")}
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <FieldLabel htmlFor={`sym-text-${sym.localId}`} hint={t("symptoms.hinglishNote")}>
                  {t("symptoms.freeText")}
                </FieldLabel>
                <Textarea
                  id={`sym-text-${sym.localId}`}
                  value={sym.freeText}
                  placeholder={t("symptoms.freeTextPlaceholder")}
                  onChange={(e) => patch(sym.localId, { freeText: e.target.value })}
                  className="min-h-[88px] border-white/15 bg-white/5 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              {needsNotice && (
                <div
                  role="alert"
                  aria-live="polite"
                  className={cn(
                    "mt-4 rounded-2xl border p-4",
                    sym.mhAck
                      ? "border-teal-300/30 bg-teal-300/[0.06]"
                      : "border-amber-300/50 bg-amber-300/10"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <HeartHandshake
                      aria-hidden="true"
                      className="mt-0.5 h-5 w-5 shrink-0 text-teal-300"
                    />
                    <div>
                      <p className="text-sm leading-relaxed text-slate-100">
                        {t("symptoms.mentalHealthNotice")}
                      </p>
                      {!sym.mhAck ? (
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => patch(sym.localId, { mhAck: true })}
                            className="min-h-[44px] rounded-full bg-teal-300 font-semibold text-[#0A1220] hover:bg-teal-200"
                          >
                            {t("app.continue")}
                          </Button>
                          <span className="text-xs text-slate-400">
                            {t("symptoms.mentalHealthNoticeContinue")}
                          </span>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-teal-200">
                          {t("symptoms.mentalHealthNoticeContinue")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addSymptom}
        className="mt-4 min-h-[44px] w-full rounded-xl border-dashed border-white/20 bg-transparent text-slate-300 hover:border-teal-300/40 hover:text-teal-200 sm:w-auto"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        {t("symptoms.addAnother")}
      </Button>
    </div>
  );
}

/* ================= CONDITIONS / MEDICATIONS / ALLERGIES ================= */

export function ConditionsStep({
  value,
  onChange,
  saveState,
  onRetry,
}: {
  value: ConditionsForm;
  onChange: (patch: Partial<ConditionsForm>) => void;
  saveState: SaveState;
  onRetry: () => void;
}) {
  const { t } = usePhiT();
  return (
    <div>
      <StepHeader
        title={t("conditions.title")}
        intro={t("conditions.intro")}
        saveState={saveState}
        onRetry={onRetry}
      />

      <h3 className="mb-2.5 text-sm font-semibold text-slate-200">
        {t("conditions.list")}
      </h3>
      <div className="space-y-2.5">
        {value.conditions.map((row) => (
          <div
            key={row.localId}
            className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[1fr_10rem_auto]"
          >
            <div>
              <FieldLabel htmlFor={`cond-name-${row.localId}`}>
                {t("conditions.name")}
              </FieldLabel>
              <Input
                id={`cond-name-${row.localId}`}
                value={row.name}
                onChange={(e) =>
                  onChange({
                    conditions: value.conditions.map((r) =>
                      r.localId === row.localId ? { ...r, name: e.target.value } : r
                    ),
                  })
                }
                className="h-10 border-white/15 bg-white/5 text-slate-100"
              />
            </div>
            <div>
              <FieldLabel htmlFor={`cond-status-${row.localId}`}>
                {t("conditions.status")}
              </FieldLabel>
              <Select
                value={row.status}
                onValueChange={(v) =>
                  onChange({
                    conditions: value.conditions.map((r) =>
                      r.localId === row.localId ? { ...r, status: v } : r
                    ),
                  })
                }
              >
                <SelectTrigger
                  id={`cond-status-${row.localId}`}
                  className="h-10 w-full border-white/15 bg-white/5 text-slate-100"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#101B31] text-slate-100">
                  <SelectItem value="active">{t("conditions.status.active")}</SelectItem>
                  <SelectItem value="managed">{t("conditions.status.managed")}</SelectItem>
                  <SelectItem value="resolved">{t("conditions.status.resolved")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <RemoveRowButton
              label={t("conditions.removeItem")}
              onClick={() =>
                onChange({
                  conditions: value.conditions.filter((r) => r.localId !== row.localId),
                })
              }
            />
          </div>
        ))}
      </div>
      <AddRowButton
        label={t("conditions.addItem")}
        onClick={() =>
          onChange({
            conditions: [
              ...value.conditions,
              { localId: nextLocalId("cond"), name: "", status: "active" },
            ],
          })
        }
      />

      <h3 className="mb-2.5 mt-6 text-sm font-semibold text-slate-200">
        {t("conditions.medications")}
      </h3>
      <div className="space-y-2.5">
        {value.medications.map((row) => (
          <div
            key={row.localId}
            className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[1fr_8rem_8rem_auto]"
          >
            <div>
              <FieldLabel htmlFor={`med-name-${row.localId}`}>
                {t("conditions.medName")}
              </FieldLabel>
              <Input
                id={`med-name-${row.localId}`}
                value={row.name}
                onChange={(e) =>
                  onChange({
                    medications: value.medications.map((r) =>
                      r.localId === row.localId ? { ...r, name: e.target.value } : r
                    ),
                  })
                }
                className="h-10 border-white/15 bg-white/5 text-slate-100"
              />
            </div>
            <div>
              <FieldLabel htmlFor={`med-strength-${row.localId}`}>
                {t("conditions.medStrength")}
              </FieldLabel>
              <Input
                id={`med-strength-${row.localId}`}
                value={row.strength}
                onChange={(e) =>
                  onChange({
                    medications: value.medications.map((r) =>
                      r.localId === row.localId ? { ...r, strength: e.target.value } : r
                    ),
                  })
                }
                className="h-10 border-white/15 bg-white/5 text-slate-100"
              />
            </div>
            <div>
              <FieldLabel htmlFor={`med-freq-${row.localId}`}>
                {t("conditions.medFrequency")}
              </FieldLabel>
              <Input
                id={`med-freq-${row.localId}`}
                value={row.frequency}
                onChange={(e) =>
                  onChange({
                    medications: value.medications.map((r) =>
                      r.localId === row.localId ? { ...r, frequency: e.target.value } : r
                    ),
                  })
                }
                className="h-10 border-white/15 bg-white/5 text-slate-100"
              />
            </div>
            <RemoveRowButton
              label={t("conditions.removeItem")}
              onClick={() =>
                onChange({
                  medications: value.medications.filter(
                    (r) => r.localId !== row.localId
                  ),
                })
              }
            />
          </div>
        ))}
      </div>
      <AddRowButton
        label={t("conditions.addItem")}
        onClick={() =>
          onChange({
            medications: [
              ...value.medications,
              { localId: nextLocalId("med"), name: "", strength: "", frequency: "" },
            ],
          })
        }
      />

      <h3 className="mb-2.5 mt-6 text-sm font-semibold text-slate-200">
        {t("conditions.allergies")}
      </h3>
      <div className="space-y-2.5">
        {value.allergies.map((row) => (
          <div
            key={row.localId}
            className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3"
          >
            <div>
              <FieldLabel htmlFor={`alr-sub-${row.localId}`}>
                {t("conditions.allergySubstance")}
              </FieldLabel>
              <Input
                id={`alr-sub-${row.localId}`}
                value={row.substance}
                onChange={(e) =>
                  onChange({
                    allergies: value.allergies.map((r) =>
                      r.localId === row.localId ? { ...r, substance: e.target.value } : r
                    ),
                  })
                }
                className="h-10 border-white/15 bg-white/5 text-slate-100"
              />
            </div>
            <div>
              <FieldLabel htmlFor={`alr-rea-${row.localId}`}>
                {t("conditions.allergyReaction")}
              </FieldLabel>
              <Input
                id={`alr-rea-${row.localId}`}
                value={row.reaction}
                onChange={(e) =>
                  onChange({
                    allergies: value.allergies.map((r) =>
                      r.localId === row.localId ? { ...r, reaction: e.target.value } : r
                    ),
                  })
                }
                className="h-10 border-white/15 bg-white/5 text-slate-100"
              />
            </div>
            <RemoveRowButton
              label={t("conditions.removeItem")}
              onClick={() =>
                onChange({
                  allergies: value.allergies.filter((r) => r.localId !== row.localId),
                })
              }
            />
          </div>
        ))}
      </div>
      <AddRowButton
        label={t("conditions.addItem")}
        onClick={() =>
          onChange({
            allergies: [
              ...value.allergies,
              { localId: nextLocalId("alr"), substance: "", reaction: "" },
            ],
          })
        }
      />
    </div>
  );
}

function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className="mt-2.5 min-h-[40px] rounded-full border-dashed border-white/20 bg-transparent text-slate-300 hover:border-teal-300/40 hover:text-teal-200"
    >
      <Plus aria-hidden="true" className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

function RemoveRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="mb-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/5 hover:text-rose-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
    >
      <Trash2 aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}

/* ================= LIFESTYLE ================= */

export function LifestyleStep({
  value,
  onChange,
  saveState,
  onRetry,
}: {
  value: LifestyleForm;
  onChange: (patch: Partial<LifestyleForm>) => void;
  saveState: SaveState;
  onRetry: () => void;
}) {
  const { t } = usePhiT();
  return (
    <div>
      <StepHeader
        title={t("lifestyle.title")}
        intro={t("lifestyle.intro")}
        saveState={saveState}
        onRetry={onRetry}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="ls-diet">{t("lifestyle.diet")}</FieldLabel>
          <Select
            value={value.dietaryPref || undefined}
            onValueChange={(v) => onChange({ dietaryPref: v })}
          >
            <SelectTrigger
              id="ls-diet"
              className="h-11 w-full border-white/15 bg-white/5 text-slate-100"
            >
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#101B31] text-slate-100">
              {["vegetarian", "non_vegetarian", "eggetarian", "vegan", "jain", "other"].map(
                (d) => (
                  <SelectItem key={d} value={d}>
                    {t(`lifestyle.diet.${d}`)}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="ls-cuisine">{t("lifestyle.cuisine")}</FieldLabel>
          <Select
            value={value.cuisine || undefined}
            onValueChange={(v) => onChange({ cuisine: v })}
          >
            <SelectTrigger
              id="ls-cuisine"
              className="h-11 w-full border-white/15 bg-white/5 text-slate-100"
            >
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#101B31] text-slate-100">
              {[
                "north_indian",
                "south_indian",
                "east_indian",
                "west_indian",
                "northeast_indian",
                "mixed",
              ].map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`lifestyle.cuisine.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="ls-sleep" why={t("lifestyle.sleepWhy")}>
            {t("lifestyle.sleep")}
          </FieldLabel>
          <Input
            id="ls-sleep"
            type="number"
            inputMode="decimal"
            min={0}
            max={16}
            step={0.5}
            value={value.sleepHours}
            onChange={(e) => onChange({ sleepHours: e.target.value })}
            className="h-11 border-white/15 bg-white/5 text-slate-100"
          />
        </div>
        <div>
          <FieldLabel htmlFor="ls-sleepq">{t("lifestyle.sleepQuality")}</FieldLabel>
          <Select
            value={value.sleepQuality}
            onValueChange={(v) => onChange({ sleepQuality: v })}
          >
            <SelectTrigger
              id="ls-sleepq"
              className="h-11 w-full border-white/15 bg-white/5 text-slate-100"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#101B31] text-slate-100">
              <SelectItem value="good">{t("lifestyle.sleepQuality.good")}</SelectItem>
              <SelectItem value="fair">{t("lifestyle.sleepQuality.fair")}</SelectItem>
              <SelectItem value="poor">{t("lifestyle.sleepQuality.poor")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="ls-activity" why={t("lifestyle.activityWhy")}>
            {t("lifestyle.activity")}
          </FieldLabel>
          <Input
            id="ls-activity"
            type="number"
            inputMode="numeric"
            min={0}
            max={2000}
            step={10}
            value={value.activityMinutes}
            onChange={(e) => onChange({ activityMinutes: e.target.value })}
            className="h-11 border-white/15 bg-white/5 text-slate-100"
          />
        </div>
        <div>
          <FieldLabel htmlFor="ls-fruitsveg">{t("lifestyle.fruitsVeg")}</FieldLabel>
          <Select
            value={value.fruitsVeg || undefined}
            onValueChange={(v) => onChange({ fruitsVeg: v })}
          >
            <SelectTrigger
              id="ls-fruitsveg"
              className="h-11 w-full border-white/15 bg-white/5 text-slate-100"
            >
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#101B31] text-slate-100">
              {["rarely", "sometimes", "daily", "most_meals"].map((o) => (
                <SelectItem key={o} value={o}>
                  {t(`lifestyle.fruitsVeg.${o}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="ls-water">{t("lifestyle.water")}</FieldLabel>
          <Input
            id="ls-water"
            type="number"
            inputMode="numeric"
            min={0}
            max={30}
            value={value.waterGlasses}
            onChange={(e) => onChange({ waterGlasses: e.target.value })}
            className="h-11 border-white/15 bg-white/5 text-slate-100"
          />
        </div>
        <div>
          <FieldLabel htmlFor="ls-tobacco">{t("lifestyle.tobacco")}</FieldLabel>
          <Select
            value={value.tobacco || undefined}
            onValueChange={(v) => onChange({ tobacco: v })}
          >
            <SelectTrigger
              id="ls-tobacco"
              className="h-11 w-full border-white/15 bg-white/5 text-slate-100"
            >
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#101B31] text-slate-100">
              {["never", "former", "current"].map((o) => (
                <SelectItem key={o} value={o}>
                  {t(`lifestyle.tobacco.${o}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="ls-alcohol">{t("lifestyle.alcohol")}</FieldLabel>
          <Select
            value={value.alcohol || undefined}
            onValueChange={(v) => onChange({ alcohol: v })}
          >
            <SelectTrigger
              id="ls-alcohol"
              className="h-11 w-full border-white/15 bg-white/5 text-slate-100"
            >
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#101B31] text-slate-100">
              {["never", "occasional", "weekly", "daily"].map((o) => (
                <SelectItem key={o} value={o}>
                  {t(`lifestyle.alcohol.${o}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="ls-stress">{t("lifestyle.stress")}</FieldLabel>
          <Select
            value={value.stress || undefined}
            onValueChange={(v) => onChange({ stress: v })}
          >
            <SelectTrigger
              id="ls-stress"
              className="h-11 w-full border-white/15 bg-white/5 text-slate-100"
            >
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#101B31] text-slate-100">
              {["low", "moderate", "high"].map((o) => (
                <SelectItem key={o} value={o}>
                  {t(`lifestyle.stress.${o}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

/* ================= VITALS ================= */

export function VitalsStep({
  value,
  onChange,
  saveState,
  onRetry,
}: {
  value: VitalsForm;
  onChange: (patch: Partial<VitalsForm>) => void;
  saveState: SaveState;
  onRetry: () => void;
}) {
  const { t } = usePhiT();
  return (
    <div>
      <StepHeader
        title={t("vitals.title")}
        intro={t("vitals.intro")}
        saveState={saveState}
        onRetry={onRetry}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel
            htmlFor="vt-bp"
            why={t("vitals.bpWhy")}
            hint={t("vitals.bpHint")}
          >
            {t("vitals.bp")}
          </FieldLabel>
          <Input
            id="vt-bp"
            inputMode="numeric"
            placeholder="120/80"
            value={value.bp}
            onChange={(e) => onChange({ bp: e.target.value })}
            className="h-11 border-white/15 bg-white/5 font-mono text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <div>
          <FieldLabel htmlFor="vt-pulse">{t("vitals.pulse")}</FieldLabel>
          <Input
            id="vt-pulse"
            type="number"
            inputMode="numeric"
            value={value.pulse}
            onChange={(e) => onChange({ pulse: e.target.value })}
            className="h-11 border-white/15 bg-white/5 font-mono text-slate-100"
          />
        </div>
        <div>
          <FieldLabel htmlFor="vt-temp">{t("vitals.temperature")}</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="vt-temp"
              type="number"
              inputMode="decimal"
              step={0.1}
              value={value.temperature}
              onChange={(e) => onChange({ temperature: e.target.value })}
              className="h-11 border-white/15 bg-white/5 font-mono text-slate-100"
            />
            <div
              role="radiogroup"
              aria-label={t("vitals.tempUnit")}
              className="flex overflow-hidden rounded-lg border border-white/15"
            >
              {(["C", "F"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  role="radio"
                  aria-checked={value.tempUnit === u}
                  onClick={() => onChange({ tempUnit: u })}
                  className={cn(
                    "min-h-[44px] px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300",
                    value.tempUnit === u
                      ? "bg-teal-300/20 text-teal-100"
                      : "bg-white/5 text-slate-400 hover:text-slate-200"
                  )}
                >
                  {u === "C" ? t("vitals.tempC") : t("vitals.tempF")}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="vt-spo2">{t("vitals.spo2")}</FieldLabel>
          <Input
            id="vt-spo2"
            type="number"
            inputMode="numeric"
            min={50}
            max={100}
            value={value.spo2}
            onChange={(e) => onChange({ spo2: e.target.value })}
            className="h-11 border-white/15 bg-white/5 font-mono text-slate-100"
          />
        </div>
        <div>
          <FieldLabel
            htmlFor="vt-glucose"
            hint={t("vitals.glucoseHint")}
          >
            {t("vitals.glucose")}
          </FieldLabel>
          <div className="flex gap-2">
            <Input
              id="vt-glucose"
              type="number"
              inputMode="decimal"
              value={value.glucose}
              onChange={(e) => onChange({ glucose: e.target.value })}
              className="h-11 border-white/15 bg-white/5 font-mono text-slate-100"
            />
            <div
              role="radiogroup"
              aria-label={t("vitals.glucoseUnit")}
              className="flex overflow-hidden rounded-lg border border-white/15"
            >
              {(
                [
                  { v: "mgdl", label: "mg/dL" },
                  { v: "mmol", label: "mmol/L" },
                ] as const
              ).map((u) => (
                <button
                  key={u.v}
                  type="button"
                  role="radio"
                  aria-checked={value.glucoseUnit === u.v}
                  onClick={() => onChange({ glucoseUnit: u.v })}
                  className={cn(
                    "min-h-[44px] px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300",
                    value.glucoseUnit === u.v
                      ? "bg-teal-300/20 text-teal-100"
                      : "bg-white/5 text-slate-400 hover:text-slate-200"
                  )}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="vt-weight">{t("vitals.weight")}</FieldLabel>
          <Input
            id="vt-weight"
            type="number"
            inputMode="decimal"
            value={value.weightKg}
            onChange={(e) => onChange({ weightKg: e.target.value })}
            className="h-11 border-white/15 bg-white/5 font-mono text-slate-100"
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 sm:col-span-2">
          <div>
            <Label htmlFor="vt-rest" className="text-sm text-slate-100">
              {t("vitals.atRest")}
            </Label>
            <p className="mt-0.5 text-xs text-slate-400">{t("vitals.atRestWhy")}</p>
          </div>
          <Switch
            id="vt-rest"
            checked={value.atRest}
            onCheckedChange={(c) => onChange({ atRest: c === true })}
            className="data-[state=checked]:bg-teal-400"
          />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="vt-conf">{t("vitals.confidence")}</FieldLabel>
          <Select
            value={value.confidence}
            onValueChange={(v) =>
              onChange({ confidence: v === "unsure" ? "unsure" : "sure" })
            }
          >
            <SelectTrigger
              id="vt-conf"
              className="h-11 w-full border-white/15 bg-white/5 text-slate-100"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#101B31] text-slate-100">
              <SelectItem value="sure">{t("vitals.confidence.sure")}</SelectItem>
              <SelectItem value="unsure">{t("vitals.confidence.unsure")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

/* ================= REVIEW ================= */

export type ReviewSectionKey =
  | "profile"
  | "symptoms"
  | "conditions"
  | "lifestyle"
  | "vitals";

export function ReviewStep({
  profile,
  symptoms,
  conditions,
  lifestyle,
  vitals,
  onEdit,
}: {
  profile: ProfileForm;
  symptoms: SymptomForm[];
  conditions: ConditionsForm;
  lifestyle: LifestyleForm;
  vitals: VitalsForm;
  onEdit: (key: ReviewSectionKey) => void;
}) {
  const { t } = usePhiT();

  const profileLines = [
    profile.ageYears && `${t("profile.age")}: ${profile.ageYears}`,
    profile.sexAtBirth && `${t("profile.sex")}: ${t(`profile.sex.${profile.sexAtBirth}`)}`,
    profile.pregnancyPossibility && t("profile.pregnancy"),
    profile.heightCm && `${t("profile.height")}: ${profile.heightCm}`,
    profile.weightKg && `${t("profile.weight")}: ${profile.weightKg}`,
    profile.waistCm && `${t("profile.waist")}: ${profile.waistCm}`,
    profile.activityLevel && `${t("profile.activityLevel")}: ${t(`profile.activity.${profile.activityLevel}`)}`,
    profile.shiftWork && t("profile.shiftWork"),
  ].filter(Boolean) as string[];

  const symptomLines = symptoms.map(
    (s) =>
      `${t(`symptoms.cat.${s.category}`) || s.category} · ${t("symptoms.severity", { n: s.severity })} · ${t(
        `symptoms.onset.${s.onset}`
      )}${s.isWorsening ? ` · ${t("symptoms.isWorsening")}` : ""}${
        s.freeText ? ` · "${s.freeText}"` : ""
      }`
  );

  const conditionLines = [
    ...conditions.conditions
      .filter((c) => c.name.trim())
      .map((c) => `${c.name} (${t(`conditions.status.${c.status}`)})`),
    ...conditions.medications
      .filter((m) => m.name.trim())
      .map((m) => `${m.name}${m.strength ? ` ${m.strength}` : ""}${m.frequency ? `, ${m.frequency}` : ""}`),
    ...conditions.allergies
      .filter((a) => a.substance.trim())
      .map((a) => `${a.substance}${a.reaction ? ` → ${a.reaction}` : ""}`),
  ];

  const lifestyleLines = [
    lifestyle.dietaryPref && `${t("lifestyle.diet")}: ${t(`lifestyle.diet.${lifestyle.dietaryPref}`)}`,
    lifestyle.cuisine && `${t("lifestyle.cuisine")}: ${t(`lifestyle.cuisine.${lifestyle.cuisine}`)}`,
    lifestyle.sleepHours && `${t("lifestyle.sleep")}: ${lifestyle.sleepHours}`,
    lifestyle.sleepQuality && `${t("lifestyle.sleepQuality")}: ${t(`lifestyle.sleepQuality.${lifestyle.sleepQuality}`)}`,
    lifestyle.activityMinutes && `${t("lifestyle.activity")}: ${lifestyle.activityMinutes}`,
    lifestyle.fruitsVeg && `${t("lifestyle.fruitsVeg")}: ${t(`lifestyle.fruitsVeg.${lifestyle.fruitsVeg}`)}`,
    lifestyle.tobacco && `${t("lifestyle.tobacco")}: ${t(`lifestyle.tobacco.${lifestyle.tobacco}`)}`,
    lifestyle.alcohol && `${t("lifestyle.alcohol")}: ${t(`lifestyle.alcohol.${lifestyle.alcohol}`)}`,
    lifestyle.stress && `${t("lifestyle.stress")}: ${t(`lifestyle.stress.${lifestyle.stress}`)}`,
    lifestyle.waterGlasses && `${t("lifestyle.water")}: ${lifestyle.waterGlasses}`,
  ].filter(Boolean) as string[];

  const vitalsLines = [
    vitals.bp && `${t("vitals.bp")}: ${vitals.bp}`,
    vitals.pulse && `${t("vitals.pulse")}: ${vitals.pulse}`,
    vitals.temperature &&
      `${t("vitals.temperature")}: ${vitals.temperature}${vitals.tempUnit === "F" ? "°F" : "°C"}`,
    vitals.spo2 && `${t("vitals.spo2")}: ${vitals.spo2}`,
    vitals.glucose &&
      `${t("vitals.glucose")}: ${vitals.glucose}${vitals.glucoseUnit === "mmol" ? " mmol/L" : " mg/dL"}`,
    vitals.weightKg && `${t("vitals.weight")}: ${vitals.weightKg}`,
  ].filter(Boolean) as string[];

  const sections: { key: ReviewSectionKey; title: string; icon: React.ReactNode; lines: string[] }[] = [
    {
      key: "profile",
      title: t("review.section.profile"),
      icon: <UserRound aria-hidden="true" className="h-4 w-4 text-teal-300" />,
      lines: profileLines,
    },
    {
      key: "symptoms",
      title: t("review.section.symptoms"),
      icon: <PencilLine aria-hidden="true" className="h-4 w-4 text-teal-300" />,
      lines: symptomLines,
    },
    {
      key: "conditions",
      title: t("review.section.conditions"),
      icon: <ListChecks aria-hidden="true" className="h-4 w-4 text-teal-300" />,
      lines: conditionLines,
    },
    {
      key: "lifestyle",
      title: t("review.section.lifestyle"),
      icon: <BadgeCheck aria-hidden="true" className="h-4 w-4 text-teal-300" />,
      lines: lifestyleLines,
    },
    {
      key: "vitals",
      title: t("review.section.vitals"),
      icon: <ShieldCheck aria-hidden="true" className="h-4 w-4 text-teal-300" />,
      lines: vitalsLines,
    },
  ];

  return (
    <div>
      <StepHeader title={t("review.title")} intro={t("review.intro")} />
      <div className="space-y-3">
        {sections.map((s) => (
          <div
            key={s.key}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                {s.icon}
                {s.title}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEdit(s.key)}
                className="min-h-[36px] rounded-full text-xs text-teal-300 hover:bg-teal-300/10 hover:text-teal-200"
              >
                <PencilLine aria-hidden="true" className="h-3.5 w-3.5" />
                {t("review.edit")}
              </Button>
            </div>
            {s.lines.length === 0 ? (
              <p className="text-xs text-slate-500">{t("review.noneRecorded")}</p>
            ) : (
              <ul className="space-y-1.5">
                {s.lines.map((line, i) => (
                  <li key={`${s.key}-${i}`} className="flex gap-2 text-sm text-slate-300">
                    <span aria-hidden="true" className="mt-[7px] size-1 shrink-0 rounded-full bg-teal-300/60" />
                    <span className="leading-relaxed">{line}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4">
        <SkipNote>{t("review.runWhy")}</SkipNote>
      </div>
    </div>
  );
}
