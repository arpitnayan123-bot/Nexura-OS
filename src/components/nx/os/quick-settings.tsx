"use client";

import { Compass, LockKeyhole, Moon, MoonStar, PersonStanding, Settings, Sun, SunMoon, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOs, type Accent, type Density, type MotionMode, type ThemeMode } from "./store";

/* ============================================================
   HOSPITAL OS — quick settings / control center
   Frequency-ordered controls, anchored to the system bar.
   ============================================================ */

const ACCENT_SWATCHES: Array<{ id: Accent; label: string; css: string }> = [
  { id: "amber", label: "Solar Amber", css: "oklch(0.815 0.135 78)" },
  { id: "jade", label: "Jade", css: "oklch(0.78 0.14 168)" },
  { id: "coral", label: "Coral", css: "oklch(0.74 0.15 35)" },
  { id: "cyan", label: "Mineral Cyan", css: "oklch(0.79 0.11 210)" },
  { id: "violet", label: "Iris", css: "oklch(0.74 0.14 300)" },
];

export function NxQuickSettings() {
  const os = useOs();
  const openApp = useOs((s) => s.openApp);

  return (
    <section
      className="nx-pop right-1.5 top-[calc(100%+6px)] w-[min(360px,calc(100vw-16px))] p-3"
      aria-label="Quick settings"
    >
      {/* theme */}
      <div className="mb-3 grid grid-cols-3 gap-1.5 rounded-xl bg-inset p-1.5" role="radiogroup" aria-label="Theme">
        {([
          { v: "auto", label: "Auto", icon: SunMoon },
          { v: "light", label: "Light", icon: Sun },
          { v: "dark", label: "Dark", icon: Moon },
        ] as Array<{ v: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }> }>).map((o) => (
          <button
            key={o.v}
            role="radio"
            aria-checked={os.theme === o.v}
            onClick={() => os.setTheme(o.v)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] transition",
              os.theme === o.v ? "bg-panel-3 font-medium text-ink shadow-[var(--nx-e1)]" : "text-ink-3 hover:text-ink"
            )}
          >
            <o.icon className="h-3.5 w-3.5" /> {o.label}
          </button>
        ))}
      </div>

      {/* toggles */}
      <div className="mb-3 grid grid-cols-2 gap-1.5">
        <QSTile
          on={os.focus}
          onClick={() => os.setFocus(!os.focus)}
          icon={MoonStar}
          label="Focus"
          hint={os.focus ? "Critical only" : "All alerts"}
        />
        <QSTile
          on={os.night}
          onClick={() => os.setNight(!os.night)}
          icon={MoonStar}
          label="Night shift"
          hint="Warm tint"
        />
        <QSTile
          on={os.motion === "reduced"}
          onClick={() => os.setMotion((os.motion === "reduced" ? "full" : "reduced") as MotionMode)}
          icon={PersonStanding}
          label="Reduce motion"
          hint={os.motion === "reduced" ? "Off" : "On demand"}
        />
        <QSTile
          on={os.density === "compact"}
          onClick={() => os.setDensity((os.density === "compact" ? "comfortable" : "compact") as Density)}
          icon={Type}
          label="Compact"
          hint="Denser lists"
        />
      </div>

      {/* accent */}
      <div className="mb-1 flex items-center justify-between px-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-4">Accent</p>
        <span className="text-[11px] capitalize text-ink-3">{os.accent}</span>
      </div>
      <div className="mb-3 flex gap-2 px-1" role="radiogroup" aria-label="Accent color">
        {ACCENT_SWATCHES.map((a) => (
          <button
            key={a.id}
            role="radio"
            aria-checked={os.accent === a.id}
            title={a.label}
            aria-label={`Accent ${a.label}`}
            onClick={() => os.setAccent(a.id)}
            className={cn(
              "h-7 w-7 rounded-full transition-transform hover:scale-110",
              os.accent === a.id && "ring-2 ring-ink ring-offset-2 ring-offset-panel-3"
            )}
            style={{ background: a.css }}
          />
        ))}
      </div>

      {/* footer */}
      <div className="flex gap-1.5">
        <button
          onClick={() => { useOs.getState().lock(); }}
          className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-[12.5px] text-ink-2 transition hover:bg-inset hover:text-ink"
        >
          <LockKeyhole className="h-4 w-4" /> Lock
        </button>
        <button
          onClick={() => { openApp("settings"); }}
          className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-[12.5px] text-ink-2 transition hover:bg-inset hover:text-ink"
        >
          <Settings className="h-4 w-4" /> All settings
          <Compass className="ml-auto h-3.5 w-3.5 text-ink-4" />
        </button>
      </div>
    </section>
  );
}

function QSTile({ on, onClick, icon: Icon, label, hint }: {
  on: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition",
        on ? "border-accent-line bg-accent-soft text-ink" : "border-line bg-inset text-ink-2 hover:text-ink"
      )}
    >
      <Icon className={cn("h-4 w-4", on ? "text-accent" : "text-ink-3")} />
      <span className="text-[12px] font-medium">{label}</span>
      {hint && <span className="text-[10.5px] text-ink-4">{hint}</span>}
    </button>
  );
}
