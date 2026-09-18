"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  HeartPulse,
  Keyboard,
  LockKeyhole,
  LogOut,
  Moon,
  MoonStar,
  PersonStanding,
  Settings,
  Sun,
  Type,
} from "lucide-react";
import { useState } from "react";
import { useNx, useDebounced } from "../client";
import { APPS } from "./registry";
import { useOs } from "./store";

/* ============================================================
   HOSPITAL OS — command palette (⌘K)
   Distinguishes executable commands from navigation results.
   ============================================================ */

export function NxPalette({ allowed, onSignOut }: { allowed: Set<string>; onSignOut: () => void }) {
  const open = useOs((s) => s.paletteOpen);
  const setPalette = useOs((s) => s.setPalette);
  /* Fine-grained selectors — the palette stays mounted, so a whole-store
     subscription re-rendered it (and re-filtered commands) on every focus,
     geometry and z-order change anywhere in the OS. */
  const resolvedTheme = useOs((s) => s.resolvedTheme);
  const focusMode = useOs((s) => s.focus);
  const night = useOs((s) => s.night);
  const motion = useOs((s) => s.motion);
  const density = useOs((s) => s.density);
  const recents = useOs((s) => s.recents);
  const active = useOs((s) => s.active);
  const setTheme = useOs((s) => s.setTheme);
  const setFocus = useOs((s) => s.setFocus);
  const setNight = useOs((s) => s.setNight);
  const setMotion = useOs((s) => s.setMotion);
  const setDensity = useOs((s) => s.setDensity);
  const [q, setQ] = useState("");
  // Debounced search — typing fired one API request per keystroke before.
  const dq = useDebounced(q, 250);
  const { data } = useNx<{ patients: Array<{ id: string; fullName: string; uhid: string }> }>(
    open && dq.trim().length >= 2
      ? `/api/nx/patients?q=${encodeURIComponent(dq.trim())}&take=5`
      : null,
  );

  const run = (fn: () => void) => () => {
    fn();
    setPalette(false);
  };

  const commands = [
    resolvedTheme === "dark"
      ? { icon: Sun, label: "Switch to Light appearance", kbd: "", fn: () => setTheme("light") }
      : { icon: Moon, label: "Switch to Dark appearance", kbd: "", fn: () => setTheme("dark") },
    {
      icon: MoonStar,
      label: focusMode ? "Turn off Focus mode" : "Turn on Focus mode",
      kbd: "",
      fn: () => setFocus(!focusMode),
    },
    {
      icon: Sun,
      label: night ? "Turn off Night shift" : "Turn on Night shift",
      kbd: "",
      fn: () => setNight(!night),
    },
    {
      icon: PersonStanding,
      label: motion === "reduced" ? "Enable full motion" : "Reduce motion",
      kbd: "",
      fn: () => setMotion(motion === "reduced" ? "full" : "reduced"),
    },
    {
      icon: Type,
      label: density === "compact" ? "Use comfortable density" : "Use compact density",
      kbd: "",
      fn: () => setDensity(density === "compact" ? "comfortable" : "compact"),
    },
    { icon: LockKeyhole, label: "Lock screen", kbd: "⌘L", fn: () => useOs.getState().lock() },
    {
      icon: Keyboard,
      label: "Show keyboard shortcuts",
      kbd: "?",
      fn: () => useOs.getState().openApp("settings"),
    },
    {
      icon: Settings,
      label: "Open System Settings",
      kbd: "",
      fn: () => useOs.getState().openApp("settings"),
    },
    { icon: LogOut, label: "Sign out", kbd: "", fn: onSignOut },
  ];

  const apps = APPS.filter((a) => a.system || allowed.has(a.key));

  return (
    <Dialog open={open} onOpenChange={setPalette}>
      <DialogContent
        aria-describedby={undefined}
        className="nx-pop-center !fixed left-1/2 top-[16%] w-[min(600px,calc(100vw-24px))] translate-y-0 gap-0 overflow-hidden rounded-2xl border-line p-0"
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command
          className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-ink-4"
          loop
        >
          <CommandInput
            value={q}
            onValueChange={setQ}
            placeholder="Type a command, module, or patient name…"
            className="border-b border-line text-[14px]"
          />
          <CommandList className="nx-scroll max-h-[380px]">
            <CommandEmpty className="py-10 text-center text-sm text-ink-3">
              Nothing found.
            </CommandEmpty>

            <CommandGroup heading="Commands">
              {commands.map((c) => (
                <CommandItem
                  key={c.label}
                  value={`cmd-${c.label}`}
                  onSelect={run(c.fn)}
                  className="gap-2.5"
                >
                  <c.icon className="h-4 w-4 text-accent" />
                  <span className="text-ink">{c.label}</span>
                  {c.kbd && (
                    <kbd className="ml-auto rounded border border-line-2 bg-inset px-1.5 py-0.5 text-[10px] text-ink-4">
                      {c.kbd}
                    </kbd>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="bg-line" />

            {recents.filter((k) => k !== active).length > 0 && (
              <>
                <CommandGroup heading="Recent modules">
                  {recents
                    .filter((k) => k !== active)
                    .slice(0, 4)
                    .map((k) => {
                      const a = APPS.find((x) => x.key === k);
                      if (!a) return null;
                      return (
                        <CommandItem
                          key={k}
                          value={`recent-${a.label}`}
                          onSelect={run(() => useOs.getState().openApp(k))}
                          className="gap-2.5"
                        >
                          <a.icon className="h-4 w-4 text-ink-3" />
                          <span className="text-ink">{a.label}</span>
                        </CommandItem>
                      );
                    })}
                </CommandGroup>
                <CommandSeparator className="bg-line" />
              </>
            )}

            <CommandGroup heading="Open app">
              {apps.map((a) => (
                <CommandItem
                  key={a.key}
                  value={`app-${a.label}`}
                  onSelect={run(() => useOs.getState().openApp(a.key))}
                  className="gap-2.5"
                >
                  <a.icon className="h-4 w-4 text-ink-3" />
                  <span className="text-ink">{a.label}</span>
                  <span className="ml-auto truncate text-[11px] text-ink-4">{a.desc}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            {Boolean(data?.patients?.length) && (
              <>
                <CommandSeparator className="bg-line" />
                <CommandGroup heading="Patients">
                  {data?.patients.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={`patient-${p.uhid}-${p.fullName}`}
                      onSelect={run(() => {
                        window.dispatchEvent(new CustomEvent("nx-open-patient", { detail: p.id }));
                        useOs.getState().openApp("patients");
                      })}
                      className="gap-2.5"
                    >
                      <HeartPulse className="h-4 w-4 text-crit" />
                      <span className="text-ink">{p.fullName}</span>
                      <span className="ml-auto font-mono text-[11px] text-ink-4">{p.uhid}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
