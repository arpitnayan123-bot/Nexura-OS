"use client";

import { BellOff, CheckCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "../client";
import { useOs, type NoticeTone } from "./store";
import { appFor } from "./registry";

/* ============================================================
   HOSPITAL OS — notification center
   Grouped, prioritized, actionable. Anchored to the system bar.
   ============================================================ */

const TONE_DOT: Record<NoticeTone, string> = {
  crit: "bg-crit",
  warn: "bg-warn",
  info: "bg-info",
  good: "bg-good",
};

export function NxNotificationCenter() {
  const notices = useOs((s) => s.notices);
  const readNotice = useOs((s) => s.readNotice);
  const dismissNotice = useOs((s) => s.dismissNotice);
  const markAllRead = useOs((s) => s.markAllRead);
  const clearNotices = useOs((s) => s.clearNotices);
  const setNotif = useOs((s) => s.setNotif);
  const openApp = useOs((s) => s.openApp);

  const unread = notices.filter((n) => !n.read).length;
  const critical = notices.filter((n) => n.tone === "crit");

  const open = (moduleKey?: string, id?: string) => {
    if (id) readNotice(id);
    if (moduleKey && appFor(moduleKey)) { setNotif(false); openApp(moduleKey); }
  };

  return (
    <section
      className="nx-pop right-1.5 top-[calc(100%+6px)] flex max-h-[min(560px,calc(100dvh-70px))] w-[min(400px,calc(100vw-16px))] flex-col"
      aria-label="Notifications"
    >
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold text-ink">Notifications</h2>
          <p className="text-[11px] text-ink-4">
            {unread > 0 ? `${unread} unread${critical.length ? ` · ${critical.length} critical` : ""}` : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={markAllRead} className="nx-bar-item text-ink-3" title="Mark all read">
            <CheckCheck className="h-3.5 w-3.5" />
          </button>
          <button onClick={clearNotices} className="nx-bar-item text-ink-3" title="Clear all">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="nx-scroll min-h-0 flex-1 overflow-y-auto p-2">
        {notices.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <BellOff className="h-6 w-6 text-ink-4" />
            <p className="text-[13px] font-medium text-ink-2">You're all caught up</p>
            <p className="max-w-[240px] text-[11.5px] leading-relaxed text-ink-4">
              Critical results, incidents and task updates will appear here as they happen.
            </p>
          </div>
        ) : (
          notices.map((n) => (
            <div
              key={n.id}
              className={cn(
                "group relative flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition",
                n.read ? "opacity-70 hover:opacity-100" : "",
                "hover:bg-inset"
              )}
              onClick={() => open(n.moduleKey, n.id)}
            >
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TONE_DOT[n.tone])} />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-[12.5px]", n.tone === "crit" ? "font-semibold text-crit" : "font-medium text-ink")}>
                  {n.title}
                </p>
                {n.body && <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-ink-3">{n.body}</p>}
                <p className="mt-1 flex items-center gap-1.5 text-[10.5px] text-ink-4">
                  {n.moduleKey && appFor(n.moduleKey) && <span>{appFor(n.moduleKey)!.label}</span>}
                  {n.moduleKey && appFor(n.moduleKey) && <span>·</span>}
                  {timeAgo(new Date(n.ts))}
                  {!n.read && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
                </p>
              </div>
              <button
                className="absolute right-2 top-2 rounded-md p-1 text-ink-4 opacity-0 transition hover:bg-line hover:text-ink group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); dismissNotice(n.id); }}
                aria-label="Dismiss notification"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
