"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { APPS, appFor, type AppDef } from "./registry";
import { useOs } from "./store";

/* ============================================================
   HOSPITAL OS — launcher (Launchpad)
   Search-first, categorized, keyboard navigable.
   ============================================================ */

export function NxLauncher({ allowed }: { allowed: Set<string> }) {
  const setLauncher = useOs((s) => s.setLauncher);
  const openApp = useOs((s) => s.openApp);
  const recents = useOs((s) => s.recents);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const apps = useMemo(() => APPS.filter((a) => a.system || allowed.has(a.key)), [allowed]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return apps;
    return apps.filter((a) => `${a.label} ${a.desc} ${a.group}`.toLowerCase().includes(s));
  }, [q, apps]);

  const grouped = useMemo(() => {
    const g = new Map<string, AppDef[]>();
    for (const a of filtered) {
      const list = g.get(a.group) || [];
      list.push(a);
      g.set(a.group, list);
    }
    return [...g.entries()];
  }, [filtered]);

  const flat = grouped.flatMap(([, list]) => list);
  const recentDefs = recents.map((k) => appFor(k)).filter(Boolean).slice(0, 5) as AppDef[];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); setLauncher(false); }
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, flat.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && flat[idx]) { openApp(flat[idx].key); }
  };

  let cursor = -1; // flat index counter during render

  return (
    <div className="nx-overlay-scrim" onClick={() => setLauncher(false)} onKeyDown={onKey}>
      <div className="nx-launcher" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto flex w-full max-w-2xl flex-col px-6 pt-[12vh]">
          {/* search */}
          <div className="flex items-center gap-3 rounded-2xl border border-line-2 bg-panel-3 px-5 py-4 shadow-[var(--nx-e4)]">
            <Search className="h-5 w-5 shrink-0 text-ink-4" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => { setQ(e.target.value); setIdx(0); }}
              placeholder="Search apps and tools…"
              aria-label="Search apps"
              className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-4"
            />
            <kbd className="rounded-md border border-line-2 bg-inset px-2 py-1 text-[10px] text-ink-4">Esc</kbd>
          </div>

          <div className="nx-scroll mt-6 max-h-[calc(100dvh-260px)] overflow-y-auto pb-10">
            {/* recents */}
            {!q && recentDefs.length > 0 && (
              <section className="mb-6">
                <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-4">
                  <Clock3 className="h-3 w-3" /> Recent
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentDefs.map((a) => (
                    <button
                      key={a.key}
                      onClick={() => openApp(a.key)}
                      className="flex items-center gap-2 rounded-full border border-line bg-panel px-3.5 py-1.5 text-[12px] text-ink-2 transition hover:border-accent-line hover:text-ink"
                    >
                      <a.icon className="h-3.5 w-3.5 text-accent" /> {a.label}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* categorized grid */}
            {grouped.map(([group, list]) => (
              <section key={group} className="mb-6">
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-4">{group}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {list.map((a) => {
                    cursor += 1;
                    const active = cursor === idx;
                    return (
                      <button
                        key={a.key}
                        onClick={() => openApp(a.key)}
                        onMouseEnter={() => setIdx(flat.indexOf(a))}
                        className={cn(
                          "group flex flex-col items-start gap-2.5 rounded-2xl border p-3.5 text-left transition",
                          active
                            ? "border-accent-line bg-accent-soft"
                            : "border-line bg-panel hover:border-line-2 hover:bg-panel-2"
                        )}
                      >
                        <span className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl transition",
                          active ? "bg-accent text-accent-ink" : "bg-accent-soft text-accent"
                        )}>
                          <a.icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-ink">{a.label}</span>
                          <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-ink-4">{a.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}

            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm font-medium text-ink-2">No apps match “{q}”</p>
                <p className="mt-1 text-xs text-ink-4">Try “beds”, “labs” or “analytics”.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
