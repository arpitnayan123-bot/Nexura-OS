"use client";

import { useEffect, useState } from "react";
import { BellOff, CheckCheck, X, ServerCrash, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { nx, timeAgo, useNx, type NxStreamEvent } from "../client";
import { toast } from "./toast";
import { useOs, type NoticeTone } from "./store";
import { appFor } from "./registry";

/* ============================================================
   HOSPITAL OS — notification center (live)
   Merges two sources:
   • persistent notifications  → /api/nx/notifications (server, role-broadcast)
   • ephemeral session notices → OS store (live SSE events, alerts)
   Mark-read persists to the server; the incident/maintenance
   banner surfaces at the top when active.
   ============================================================ */

const TONE_DOT: Record<NoticeTone, string> = {
  crit: "bg-crit",
  warn: "bg-warn",
  info: "bg-info",
  good: "bg-good",
};

interface ServerNotification {
  id: string;
  title: string;
  body: string | null;
  level: "info" | "success" | "warning" | "critical";
  category: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const LEVEL_TONE: Record<ServerNotification["level"], NoticeTone> = {
  critical: "crit",
  warning: "warn",
  success: "good",
  info: "info",
};

export function NxNotificationCenter() {
  const notices = useOs((s) => s.notices);
  const readNotice = useOs((s) => s.readNotice);
  const dismissNotice = useOs((s) => s.dismissNotice);
  const markAllReadLocal = useOs((s) => s.markAllRead);
  const clearNotices = useOs((s) => s.clearNotices);
  const setNotif = useOs((s) => s.setNotif);
  const openApp = useOs((s) => s.openApp);

  const { data, refresh } = useNx<{ notifications: ServerNotification[]; unread: number }>(
    "/api/nx/notifications?perPage=25",
    { pollMs: 45000 },
  );
  const [localRead, setLocalRead] = useState<Set<string>>(new Set());
  const serverNotifs = (data?.notifications ?? []).filter((n) => !localRead.has(n.id));

  // Live updates: when a notification event arrives, refetch
  useEffect(() => {
    const onLive = (e: Event) => {
      const ev = (e as CustomEvent<NxStreamEvent>).detail;
      if (ev?.event === "notification.new") void refresh();
    };
    window.addEventListener("nx-live-event", onLive);
    return () => window.removeEventListener("nx-live-event", onLive);
  }, [refresh]);

  const unread =
    serverNotifs.filter((n) => !n.readAt).length + notices.filter((n) => !n.read).length;

  const open = (moduleKey?: string, id?: string) => {
    if (id) readNotice(id);
    if (moduleKey && appFor(moduleKey)) {
      setNotif(false);
      openApp(moduleKey);
    }
  };

  async function openServer(n: ServerNotification) {
    if (!n.readAt) {
      setLocalRead((s) => new Set(s).add(n.id));
      try {
        await nx("/api/nx/notifications", { method: "PATCH", body: JSON.stringify({ id: n.id }) });
      } catch {
        // Roll the optimistic read back so the badge stays truthful.
        setLocalRead((s) => {
          const next = new Set(s);
          next.delete(n.id);
          return next;
        });
      }
    }
    const moduleKey = n.link?.startsWith("patient:") ? "patients" : n.link?.split(":")[0];
    open(moduleKey, n.id);
  }

  async function markAllRead() {
    markAllReadLocal();
    const unreadIds = serverNotifs.filter((n) => !n.readAt).map((n) => n.id);
    if (unreadIds.length) {
      setLocalRead((s) => {
        const next = new Set(s);
        unreadIds.forEach((id) => next.add(id));
        return next;
      });
      try {
        // One batched call — this looped one PATCH per notification before.
        await nx("/api/nx/notifications", { method: "PATCH", body: JSON.stringify({ all: true }) });
      } catch {
        toast.error("Could not mark notifications as read");
      }
      void refresh();
    }
  }

  return (
    <section
      className="nx-pop right-1.5 top-[calc(100%+6px)] flex max-h-[min(560px,calc(100dvh-70px))] w-[min(400px,calc(100vw-16px))] flex-col"
      aria-label="Notifications"
    >
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold text-ink">Notifications</h2>
          <p className="text-[11px] text-ink-4">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={markAllRead}
            className="nx-bar-item text-ink-3"
            title="Mark all read"
            aria-label="Mark all read"
          >
            <CheckCheck className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={clearNotices}
            className="nx-bar-item text-ink-3"
            title="Clear session notices"
            aria-label="Clear session notices"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="nx-scroll min-h-0 flex-1 overflow-y-auto p-2">
        {serverNotifs.length === 0 && notices.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <BellOff className="h-6 w-6 text-ink-4" />
            <p className="text-[13px] font-medium text-ink-2">You're all caught up</p>
            <p className="max-w-[240px] text-[11.5px] leading-relaxed text-ink-4">
              Critical results, incidents and task updates will appear here as they happen.
            </p>
          </div>
        ) : (
          <>
            {/* persistent server notifications */}
            {serverNotifs.map((n) => {
              const tone = LEVEL_TONE[n.level];
              return (
                <div
                  key={n.id}
                  className={cn(
                    "group relative flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-inset focus-visible:bg-inset focus-visible:outline-none",
                    n.readAt ? "opacity-70 hover:opacity-100" : "",
                  )}
                  onClick={() => void openServer(n)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void openServer(n);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${n.title}${n.readAt ? " (read)" : " — unread"}`}
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TONE_DOT[tone])} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-[12.5px]",
                        n.level === "critical" ? "font-semibold text-crit" : "font-medium text-ink",
                      )}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-ink-3">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-1 flex items-center gap-1.5 text-[10.5px] text-ink-4">
                      <span className="capitalize">{n.category}</span>
                      <span>·</span>
                      {timeAgo(new Date(n.createdAt))}
                      {!n.readAt && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* ephemeral session notices (live events) */}
            {notices.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "group relative flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-inset focus-visible:bg-inset focus-visible:outline-none",
                  n.read ? "opacity-70 hover:opacity-100" : "",
                )}
                onClick={() => open(n.moduleKey, n.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open(n.moduleKey, n.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TONE_DOT[n.tone])} />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-[12.5px]",
                      n.tone === "crit" ? "font-semibold text-crit" : "font-medium text-ink",
                    )}
                  >
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-ink-3">
                      {n.body}
                    </p>
                  )}
                  <p className="mt-1 flex items-center gap-1.5 text-[10.5px] text-ink-4">
                    {n.moduleKey && appFor(n.moduleKey) && (
                      <span>{appFor(n.moduleKey)!.label}</span>
                    )}
                    {n.moduleKey && appFor(n.moduleKey) && <span>·</span>}
                    {timeAgo(new Date(n.ts))}
                    {!n.read && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
                  </p>
                </div>
                <button
                  className="absolute right-2 top-2 rounded-md p-1 text-ink-4 opacity-0 transition hover:bg-line hover:text-ink group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissNotice(n.id);
                  }}
                  aria-label="Dismiss notification"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

/** Incident/maintenance strip shown inside the notification popover header when active. */
export function NxPlatformBanner({
  status,
}: {
  status?: { enabled: boolean; message: string | null; severity: string };
}) {
  if (!status?.enabled) return null;
  const Icon = status.severity === "critical" ? ServerCrash : Wrench;
  return (
    <div
      className={cn(
        "flex items-start gap-2 border-b border-line px-4 py-2.5 text-[11.5px]",
        status.severity === "critical" ? "bg-crit-soft text-crit" : "bg-warn-soft text-warn",
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p className="leading-relaxed">
        {status.message ||
          (status.severity === "critical"
            ? "Platform incident in progress."
            : "Maintenance in progress.")}
      </p>
    </div>
  );
}
