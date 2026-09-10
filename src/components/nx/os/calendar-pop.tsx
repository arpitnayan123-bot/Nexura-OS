"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useOs } from "./store";
import { useNow } from "./use-now";

/* ============================================================
   HOSPITAL OS — calendar popover (clock tray)
   Month grid + quick jump into Scheduling.
   ============================================================ */

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

export function NxCalendarPop() {
  const now = useNow(30_000);
  const openApp = useOs((s) => s.openApp);
  const [monthOffset, setMonthOffset] = useState(0);

  const today = now ?? new Date();
  const view = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const first = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const cells: Array<{ day: number; out: boolean }> = [];
    for (let i = first - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, out: true });
    for (let d2 = 1; d2 <= daysInMonth; d2++) cells.push({ day: d2, out: false });
    while (cells.length % 7 !== 0 || cells.length < 42) cells.push({ day: cells.length - daysInMonth - first + 1, out: true });
    return {
      label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      cells: cells.slice(0, 42),
      month,
      year,
    };
  }, [today, monthOffset]);

  const isToday = (cell: { day: number; out: boolean }) =>
    !cell.out && cell.day === today.getDate() && view.month === today.getMonth() && view.year === today.getFullYear();

  return (
    <div className="nx-pop nx-cal right-24 top-[calc(100%+6px)] sm:right-28" role="dialog" aria-label="Calendar">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-ink">{view.label}</p>
        <div className="flex items-center gap-0.5">
          <button
            className="nx-bar-item h-7 w-7 justify-center px-0"
            onClick={() => setMonthOffset((m) => m - 1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            className="nx-bar-item h-7 w-7 justify-center px-0"
            onClick={() => setMonthOffset(0)}
            aria-label="Back to today"
            title="Today"
          >
            <CalendarDays className="h-3.5 w-3.5" />
          </button>
          <button
            className="nx-bar-item h-7 w-7 justify-center px-0"
            onClick={() => setMonthOffset((m) => m + 1)}
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="nx-cal-grid">
        {DOW.map((d, i) => (
          <span key={`dow-${i}`} className="nx-cal-cell nx-cal-dow" aria-hidden>{d}</span>
        ))}
        {view.cells.map((c, i) => (
          <span
            key={i}
            className="nx-cal-cell"
            data-out={c.out || undefined}
            data-today={isToday(c) || undefined}
          >
            {c.day}
          </span>
        ))}
      </div>

      <button
        onClick={() => openApp("schedule")}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-inset py-2 text-[12px] font-medium text-ink-2 transition hover:border-accent-line hover:text-ink"
      >
        <CalendarDays className="h-3.5 w-3.5 text-accent" /> Open Scheduling
      </button>
    </div>
  );
}
