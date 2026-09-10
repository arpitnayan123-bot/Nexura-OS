"use client";

import { appFor } from "./registry";
import { useOs } from "./store";

/* ============================================================
   HOSPITAL OS — app switcher (Ctrl+` / Alt+Tab)
   Most-recently-used order; Tab / ` cycles, Enter focuses,
   Esc cancels. Keyboard is handled by the global handler.
   ============================================================ */

export function NxSwitcher() {
  const wins = useOs((s) => s.wins);
  const idx = useOs((s) => s.switcherIdx);
  const confirm = useOs((s) => s.confirmSwitcher);

  const mru = [...wins].sort((a, b) => b.z - a.z);

  return (
    <div className="nx-switcher" role="dialog" aria-label="Switch between open windows">
      <div className="nx-switcher-tray" onClick={confirm}>
        {mru.map((w, i) => {
          const def = appFor(w.key);
          if (!def) return null;
          const Icon = def.icon;
          return (
            <button
              key={w.key}
              className="nx-sw-item"
              data-sel={i === idx}
              onMouseEnter={() => useOs.setState({ switcherIdx: i })}
              onClick={(e) => { e.stopPropagation(); confirm(); }}
              aria-label={`${def.label} — window ${i + 1} of ${mru.length}`}
            >
              <span className="nx-sw-ico"><Icon className="h-5 w-5" /></span>
              <span className="line-clamp-2 text-center text-[11.5px] font-medium leading-tight">{def.label}</span>
              {w.min && <span className="text-[9.5px] uppercase tracking-wider text-ink-4">minimized</span>}
            </button>
          );
        })}
        <div className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-ink-3">
          <kbd className="rounded border border-line-2 bg-panel-3 px-1.5 py-0.5 text-[10px]">Tab</kbd> cycle ·
          <kbd className="ml-1 rounded border border-line-2 bg-panel-3 px-1.5 py-0.5 text-[10px]">Enter</kbd> switch ·
          <kbd className="ml-1 rounded border border-line-2 bg-panel-3 px-1.5 py-0.5 text-[10px]">Esc</kbd> cancel
        </div>
      </div>
    </div>
  );
}
