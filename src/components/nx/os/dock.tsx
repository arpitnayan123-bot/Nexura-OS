"use client";

import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { appFor } from "./registry";
import { useOs } from "./store";
import { useIsMobile } from "./wm";

/* ============================================================
   HOSPITAL OS — dock / app shelf
   Pinned + running apps, live badges, magnify-on-hover.
   ============================================================ */

export function NxDock({ taskCount, incidentCount }: { taskCount: number; incidentCount: number }) {
  const dockPins = useOs((s) => s.dockPins);
  const wins = useOs((s) => s.wins);
  const focused = useOs((s) => s.focused);
  const openApp = useOs((s) => s.openApp);
  const setLauncher = useOs((s) => s.setLauncher);
  const launcherOpen = useOs((s) => s.launcherOpen);
  const togglePin = useOs((s) => s.togglePin);
  const isMobile = useIsMobile();

  const runningKeys = wins.map((w) => w.key);
  const allKeys = [...new Set([...dockPins.filter((k) => appFor(k)), ...runningKeys, "settings"])];
  /* on narrow screens keep the shelf short: launcher + running + settings */
  const dockKeys = isMobile
    ? [...new Set([...runningKeys, "settings"])]
    : allKeys;

  const activate = (key: string) => {
    const win = wins.find((w) => w.key === key);
    if (win && focused === key && !win.min) useOs.getState().minimizeApp(key);
    else openApp(key);
  };

  return (
    <nav className="nx-dock nx-sheen" aria-label="Dock">
      {/* launcher */}
      <button
        className="nx-dock-item"
        data-on={launcherOpen}
        onClick={() => setLauncher(!launcherOpen)}
        aria-label="Open launcher"
        aria-expanded={launcherOpen}
      >
        <LayoutGrid className={cn("h-5 w-5", launcherOpen && "text-accent")} />
        <span className="nx-dock-tip">Launchpad · ⌘J</span>
      </button>

      <div className="nx-dock-sep" />

      {dockKeys.map((key) => {
        const def = appFor(key);
        if (!def) return null;
        const Icon = def.icon;
        const running = runningKeys.includes(key);
        const win = wins.find((w) => w.key === key);
        const badge = def.badge === "tasks" ? taskCount : def.badge === "incidents" ? incidentCount : 0;
        return (
          <button
            key={key}
            className="nx-dock-item"
            data-running={running}
            data-focused={focused === key && running && !win?.min}
            onClick={() => activate(key)}
            onContextMenu={(e) => { e.preventDefault(); togglePin(key); }}
            aria-label={`${def.label}${running ? (win?.min ? " (minimized)" : " (running)") : ""}`}
          >
            <Icon className="h-[21px] w-[21px]" />
            {badge > 0 && <span className="nx-dock-badge">{badge > 99 ? "99+" : badge}</span>}
            <span className="nx-dock-tip">{def.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
