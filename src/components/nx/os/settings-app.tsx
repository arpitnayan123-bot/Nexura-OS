"use client";

import { useEffect, useState } from "react";
import { Activity, Check, Info, Moon, Palette, PersonStanding, Sun, SunMoon, Type, UserRound, Wallpaper as WallpaperIcon, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNx } from "../client";
import { useOs, type Accent, type Density, type ThemeMode, type Wallpaper } from "./store";
import { APPS } from "./registry";

/* ============================================================
   HOSPITAL OS — System Settings (window content)
   ============================================================ */

const SECTIONS = [
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "language", label: "Language & Region", icon: Type },
  { key: "accessibility", label: "Accessibility", icon: PersonStanding },
  { key: "account", label: "Account", icon: UserRound },
  { key: "about", label: "About", icon: Info },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

const ACCENTS: Array<{ id: Accent; label: string; swatch: string }> = [
  { id: "amber", label: "Solar Amber", swatch: "linear-gradient(135deg, oklch(0.815 0.135 78), oklch(0.7 0.14 65))" },
  { id: "jade", label: "Jade", swatch: "linear-gradient(135deg, oklch(0.78 0.14 168), oklch(0.62 0.12 175))" },
  { id: "coral", label: "Coral", swatch: "linear-gradient(135deg, oklch(0.74 0.15 35), oklch(0.62 0.16 30))" },
  { id: "cyan", label: "Mineral Cyan", swatch: "linear-gradient(135deg, oklch(0.79 0.11 210), oklch(0.64 0.1 215))" },
  { id: "violet", label: "Iris", swatch: "linear-gradient(135deg, oklch(0.74 0.14 300), oklch(0.58 0.15 295))" },
];

const WALLPAPERS: Array<{ id: Wallpaper; label: string; hint: string; css: string }> = [
  {
    id: "aurora", label: "Aurora", hint: "Signature amber atmosphere",
    css: "radial-gradient(120% 90% at 18% -12%, oklch(0.6 0.1 60 / 0.55), transparent 55%), radial-gradient(110% 80% at 88% 8%, oklch(0.5 0.09 300 / 0.4), transparent 52%), oklch(0.2 0.012 60)",
  },
  {
    id: "dawn", label: "Dawn", hint: "Warm rose for morning rounds",
    css: "radial-gradient(120% 90% at 18% -12%, oklch(0.72 0.1 30 / 0.6), transparent 55%), radial-gradient(110% 80% at 88% 8%, oklch(0.68 0.09 330 / 0.42), transparent 52%), oklch(0.24 0.02 30)",
  },
  {
    id: "meadow", label: "Meadow", hint: "Calm sage, easy on long shifts",
    css: "radial-gradient(120% 90% at 18% -12%, oklch(0.6 0.09 165 / 0.55), transparent 55%), radial-gradient(110% 80% at 88% 8%, oklch(0.6 0.08 200 / 0.4), transparent 52%), oklch(0.2 0.015 165)",
  },
  {
    id: "mono", label: "Mono", hint: "Pure graphite, zero atmosphere",
    css: "radial-gradient(120% 90% at 18% -12%, oklch(0.32 0.008 60 / 0.6), transparent 60%), oklch(0.18 0.008 60)",
  },
];

export function SettingsApp() {
  const [section, setSection] = useState<SectionKey>("appearance");
  const os = useOs();
  const { data: session } = useNx<{ user: { id: string; name: string; role: string; department?: string; hospitalId?: string } | null }>("/api/nx/auth");

  return (
    <div className="flex h-full min-h-0">
      {/* section rail */}
      <nav className="nx-scroll w-48 shrink-0 overflow-y-auto border-r border-line p-3" aria-label="Settings sections">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            aria-current={section === s.key ? "page" : undefined}
            className={cn(
              "mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition",
              section === s.key ? "bg-accent-soft font-medium text-accent" : "text-ink-2 hover:bg-inset hover:text-ink"
            )}
          >
            <s.icon className="h-4 w-4 shrink-0" />
            {s.label}
          </button>
        ))}
      </nav>

      <div className="nx-scroll min-w-0 flex-1 overflow-y-auto p-6">
        {section === "appearance" && (
          <div className="max-w-xl space-y-8">
            <Group title="Theme" icon={SunMoon} hint="Light and dark are designed independently — pick a mood.">
              <Segmented
                value={os.theme}
                onChange={(v) => os.setTheme(v as ThemeMode)}
                options={[
                  { value: "auto", label: "Auto", icon: SunMoon },
                  { value: "light", label: "Light", icon: Sun },
                  { value: "dark", label: "Dark", icon: Moon },
                ]}
              />
            </Group>
            <Group title="Accent" icon={Palette} hint="One signature color, applied across the system.">
              <div className="flex flex-wrap gap-3">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => os.setAccent(a.id)}
                    title={a.label}
                    aria-label={`Accent: ${a.label}`}
                    className={cn(
                      "group relative h-12 w-12 rounded-2xl transition-transform hover:scale-105",
                      os.accent === a.id && "ring-2 ring-accent ring-offset-2 ring-offset-panel"
                    )}
                    style={{ background: a.swatch }}
                  >
                    {os.accent === a.id && <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </Group>
            <Group title="Desktop" icon={WallpaperIcon} hint="The ambient wallpaper behind your windows. Right-click the desktop to switch quickly.">
              <div className="flex flex-wrap gap-3">
                {WALLPAPERS.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => os.setWallpaper(w.id)}
                    className="nx-wall-swatch max-w-[120px]"
                    data-on={os.wallpaper === w.id}
                    aria-label={`Wallpaper: ${w.label}`}
                    title={w.hint}
                    style={{ background: w.css }}
                  >
                    <span className={cn(
                      "absolute bottom-1.5 left-2 text-[10.5px] font-semibold tracking-wide",
                      os.wallpaper === w.id ? "text-white" : "text-white/70"
                    )}>
                      {w.label}
                    </span>
                    {os.wallpaper === w.id && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-white drop-shadow" />}
                  </button>
                ))}
              </div>
            </Group>
            <Group title="Density" icon={Type} hint="Compact tightens list spacing for data-heavy work.">
              <Segmented
                value={os.density}
                onChange={(v) => os.setDensity(v as Density)}
                options={[
                  { value: "comfortable", label: "Comfortable" },
                  { value: "compact", label: "Compact" },
                ]}
              />
            </Group>
            <Group title="Night warmth" icon={Moon} hint="Adds a warm tint for late shifts. Does not change data colors.">
              <Toggle checked={os.night} onChange={os.setNight} label="Night mode" />
            </Group>
          </div>
        )}

        {section === "language" && <LanguageSection />}

        {section === "accessibility" && (
          <div className="max-w-xl space-y-8">
            <Group title="Motion" icon={PersonStanding} hint="Reduced motion removes transitions and ambient animation.">
              <Segmented
                value={os.motion}
                onChange={(v) => os.setMotion(v as "full" | "reduced")}
                options={[
                  { value: "full", label: "Full motion" },
                  { value: "reduced", label: "Reduced" },
                ]}
              />
            </Group>
            <Group title="Focus" icon={Moon} hint="While on duty, critical alerts always break through.">
              <Toggle checked={os.focus} onChange={os.setFocus} label="Focus mode — quiet non-critical interruptions" />
            </Group>
            <Group title="Keyboard" icon={Type}>
              <dl className="space-y-2 text-sm">
                {[
                  ["⌘ K / Ctrl K", "Command palette"],
                  ["⌘ / Ctrl J", "Open launcher"],
                  ["⌘ / Ctrl M", "Minimize focused window"],
                  ["⌘ / Ctrl W", "Close focused window"],
                  ["⌘ / Ctrl L", "Lock the screen"],
                  ["Ctrl ` or Alt Tab", "Switch between windows"],
                  ["F9", "Overview — see every window"],
                  ["Ctrl Alt ← / →", "Previous / next workspace"],
                  ["Ctrl Alt 1–3", "Jump to a workspace"],
                  ["?", "Keyboard shortcuts (this list)"],
                  ["Esc", "Dismiss overlays"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-4">
                    <dt className="text-ink-2">{v}</dt>
                    <dd><kbd className="rounded-md border border-line-2 bg-inset px-2 py-0.5 font-mono text-[11px] text-ink-2">{k}</kbd></dd>
                  </div>
                ))}
              </dl>
            </Group>
          </div>
        )}

        {section === "account" && (
          <div className="max-w-xl space-y-6">
            <Group title="Signed-in staff" icon={UserRound} hint="Access is role-based and re-checked on every API call.">
              {session?.user ? (
                <div className="flex items-center gap-4 rounded-xl border border-line bg-panel-2 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
                    {session.user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{session.user.name}</p>
                    <p className="truncate text-xs capitalize text-ink-3">{session.user.role} · {session.user.department || "—"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-3">Session details unavailable.</p>
              )}
            </Group>
            <Group title="Connection" icon={Wifi}>
              <div className="flex items-center gap-2 text-sm text-ink-2">
                <span className="nx-tray-dot bg-good text-good" />
                {typeof navigator !== "undefined" && navigator.onLine ? "Online — live data with 30s polling" : "Offline — showing cached data"}
              </div>
            </Group>
          </div>
        )}

        {section === "about" && (
          <div className="max-w-xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="nx-brand-glyph h-14 w-14 rounded-2xl">
                <Activity className="h-7 w-7" />
              </div>
              <div>
                <p className="nx-display text-2xl text-ink">Hospital OS</p>
                <p className="text-xs text-ink-3">Nexura Hospital Operating System · Version 4.0 "Foundation"</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-ink-2">
              One calm, real-time surface for the whole hospital — command center, clinical workflows,
              operations and governed AI. {APPS.filter((a) => !a.system).length} apps installed.
              Every action is written to a tamper-evident audit chain, and AI never makes
              autonomous clinical decisions.
            </p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-line bg-panel-2 p-3">
                <dt className="text-[11px] uppercase tracking-wider text-ink-4">Data residency</dt>
                <dd className="mt-1 text-ink-2">On-prem, encrypted at rest</dd>
              </div>
              <div className="rounded-xl border border-line bg-panel-2 p-3">
                <dt className="text-[11px] uppercase tracking-wider text-ink-4">Interoperability</dt>
                <dd className="mt-1 text-ink-2">HL7 · FHIR ready</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}

function Group({ title, icon: Icon, hint, children }: { title: string; icon: React.ComponentType<{ className?: string }>; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 text-accent" />
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {hint && <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Segmented({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string; icon?: React.ComponentType<{ className?: string }> }>;
}) {
  return (
    <div role="radiogroup" className="inline-flex rounded-xl border border-line bg-inset p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] transition",
            value === o.value ? "bg-panel-3 font-medium text-ink shadow-[var(--nx-e1)]" : "text-ink-3 hover:text-ink"
          )}
        >
          {o.icon && <o.icon className="h-3.5 w-3.5" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-sm text-ink-2"
    >
      <span
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
          checked ? "border-accent-line bg-accent" : "border-line-2 bg-inset"
        )}
      >
        <span className={cn("absolute h-4.5 w-4.5 h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-[3px]")} />
      </span>
      {label}
    </button>
  );
}


/* ============================================================
   v5 — Language & Region (i18n) + device modes (tablet/kiosk)
   Locale applies to OS chrome + date/time formatting. Device modes
   optimize ward hardware: tablet = bigger touch targets, kiosk =
   locked-down single-app fullscreen with reduced chrome.
   ============================================================ */

import { LOCALES, LOCALE_LABELS, type Locale, t as tr } from "@/lib/i18n";

function readLS(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

export function LanguageSection() {
  const [locale, setLocale] = useState<Locale>(() => readLS("nx-locale", "en") as Locale);
  const [mode, setMode] = useState<"desktop" | "tablet" | "kiosk">(() => readLS("nx-mode", "desktop") as "desktop" | "tablet" | "kiosk");

  // DOM side effects belong in effects, not inline handlers (compiler-safe)
  useEffect(() => {
    document.documentElement.lang = locale;
    try { localStorage.setItem("nx-locale", locale); } catch { /* private mode */ }
  }, [locale]);
  useEffect(() => {
    document.documentElement.dataset.nxMode = mode;
    try { localStorage.setItem("nx-mode", mode); } catch { /* private mode */ }
  }, [mode]);

  const applyLocale = (l: Locale) => setLocale(l);
  const applyMode = (m: "desktop" | "tablet" | "kiosk") => setMode(m);

  return (
    <div className="max-w-xl space-y-8">
      <Group title="Language" icon={Type} hint="Applies to OS chrome, actions and statuses. Clinical content stays English until terminology review.">
        <div className="grid grid-cols-3 gap-2">
          {LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => applyLocale(l)}
              aria-pressed={locale === l}
              className={cn(
                "rounded-xl border px-3 py-3 text-sm transition-colors",
                locale === l ? "border-accent-line bg-accent-soft font-medium text-accent" : "border-line-2 bg-inset text-ink-2 hover:bg-panel-3"
              )}
            >
              {LOCALE_LABELS[l]}
              <span className="block text-[10px] font-normal text-ink-5">{tr(l, "shell.modules")} · {tr(l, "action.complete")}</span>
            </button>
          ))}
        </div>
      </Group>
      <Group title="Device mode" icon={WallpaperIcon} hint="Tablet: 44px+ touch targets for ward rounds. Kiosk: locked fullscreen single-app mode for shared devices.">
        <Segmented
          value={mode}
          onChange={(v) => applyMode(v as "desktop" | "tablet" | "kiosk")}
          options={[
            { value: "desktop", label: "Desktop" },
            { value: "tablet", label: "Tablet" },
            { value: "kiosk", label: "Kiosk" },
          ]}
        />
        <p className="text-xs text-ink-5">
          Mode sample — {tr(locale, "shell.online")} / {tr(locale, "offline.banner")}
        </p>
      </Group>
    </div>
  );
}
