"use client";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowRightLeft, HeartPulse, Keyboard, LayoutGrid, LockKeyhole, Moon, MoonStar,
  PersonStanding, Settings, Signpost, SquareStack, Sun, Type,
} from "lucide-react";
import { useState } from "react";
import { useNx } from "../client";
import { APPS } from "./registry";
import { WS_COUNT, useOs } from "./store";

/* ============================================================
   HOSPITAL OS — command palette (⌘K)
   Distinguishes executable commands from navigation results.
   ============================================================ */

export function NxPalette({ allowed, onSignOut }: { allowed: Set<string>; onSignOut: () => void }) {
  const open = useOs((s) => s.paletteOpen);
  const setPalette = useOs((s) => s.setPalette);
  const os = useOs();
  const [q, setQ] = useState("");
  const { data } = useNx<{ patients: Array<{ id: string; fullName: string; uhid: string }> }>(
    open && q.trim().length >= 2 ? `/api/nx/patients?q=${encodeURIComponent(q.trim())}&take=5` : null
  );

  const run = (fn: () => void) => () => { fn(); setPalette(false); };

  const focusedWin = os.wins.find((w) => w.key === os.focused);

  const commands = [
    os.resolvedTheme === "dark"
      ? { icon: Sun, label: "Switch to Light appearance", kbd: "", fn: () => os.setTheme("light") }
      : { icon: Moon, label: "Switch to Dark appearance", kbd: "", fn: () => os.setTheme("dark") },
    { icon: MoonStar, label: os.focus ? "Turn off Focus mode" : "Turn on Focus mode", kbd: "", fn: () => os.setFocus(!os.focus) },
    { icon: Sun, label: os.night ? "Turn off Night shift" : "Turn on Night shift", kbd: "", fn: () => os.setNight(!os.night) },
    { icon: PersonStanding, label: os.motion === "reduced" ? "Enable full motion" : "Reduce motion", kbd: "", fn: () => os.setMotion(os.motion === "reduced" ? "full" : "reduced") },
    { icon: Type, label: os.density === "compact" ? "Use comfortable density" : "Use compact density", kbd: "", fn: () => os.setDensity(os.density === "compact" ? "comfortable" : "compact") },
    { icon: LayoutGrid, label: "Show all windows (Overview)", kbd: "F9", fn: () => useOs.getState().setOverview(true) },
    { icon: LockKeyhole, label: "Lock screen", kbd: "⌘L", fn: () => useOs.getState().lock() },
    ...Array.from({ length: WS_COUNT }, (_, i) => i + 1)
      .filter((ws) => ws !== os.workspace)
      .map((ws) => ({
        icon: SquareStack,
        label: `Switch to Workspace ${ws}`,
        kbd: `Ctrl+Alt+${ws}`,
        fn: () => useOs.getState().setWorkspace(ws),
      })),
    ...(focusedWin
      ? Array.from({ length: WS_COUNT }, (_, i) => i + 1)
          .filter((ws) => ws !== focusedWin.ws)
          .map((ws) => ({
            icon: ArrowRightLeft,
            label: `Move ${focusedWin.key === "settings" ? "Settings" : "focused window"} to Workspace ${ws}`,
            kbd: "",
            fn: () => useOs.getState().moveWinToWorkspace(focusedWin.key, ws),
          }))
      : []),
    { icon: Keyboard, label: "Show keyboard shortcuts", kbd: "?", fn: () => useOs.getState().openApp("settings") },
    { icon: Settings, label: "Open System Settings", kbd: "", fn: () => useOs.getState().openApp("settings") },
    { icon: Signpost, label: "Open Launchpad", kbd: "⌘J", fn: () => useOs.getState().setLauncher(true) },
    { icon: Signpost, label: "Sign out", kbd: "", fn: onSignOut },
  ];

  const apps = APPS.filter((a) => a.system || allowed.has(a.key));

  return (
    <Dialog open={open} onOpenChange={setPalette}>
      <DialogContent aria-describedby={undefined} className="nx-pop-center !fixed left-1/2 top-[16%] w-[min(600px,calc(100vw-24px))] translate-y-0 gap-0 overflow-hidden rounded-2xl border-line p-0">
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
            <CommandEmpty className="py-10 text-center text-sm text-ink-3">Nothing found.</CommandEmpty>

            <CommandGroup heading="Commands">
              {commands.map((c) => (
                <CommandItem key={c.label} value={`cmd-${c.label}`} onSelect={run(c.fn)} className="gap-2.5">
                  <c.icon className="h-4 w-4 text-accent" />
                  <span className="text-ink">{c.label}</span>
                  {c.kbd && <kbd className="ml-auto rounded border border-line-2 bg-inset px-1.5 py-0.5 text-[10px] text-ink-4">{c.kbd}</kbd>}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="bg-line" />

            <CommandGroup heading="Open app">
              {apps.map((a) => (
                <CommandItem key={a.key} value={`app-${a.label}`} onSelect={run(() => useOs.getState().openApp(a.key))} className="gap-2.5">
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
