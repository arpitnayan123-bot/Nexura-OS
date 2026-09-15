"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell, ChevronLeft, ChevronRight, LockKeyhole, LogOut, Menu, PanelLeftClose,
  PanelLeftOpen, Search, TriangleAlert, WifiOff, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APPS, appFor, type AppCtx } from "./registry";
import { useOs, type NxNotice } from "./store";
import { NxPalette } from "./palette";
import { NxNotificationCenter } from "./notifications";
import { NxBackSync, NxBackFab } from "./back-ui";
import { Activity } from "lucide-react";

/* ============================================================
   HOSPITAL OS — console shell

   One focused hospital console instead of a simulated desktop:
   a labeled left rail (the only place you ever navigate from),
   a quiet top bar that always tells you where you are, and a
   single full-height content pane. No floating windows, no
   workspaces, no dock — a hospital worker should never have to
   learn an operating system to operate a hospital.
   ============================================================ */

type NxUser = { id: string; name: string; role: string; department?: string; hospitalId?: string };

export function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return m;
}

const GROUP_ORDER = ["Overview", "Clinical", "Operations", "System"] as const;

/* ------------------------------------------------------------------ */
/* Left rail — labeled navigation, grouped like the hospital itself    */
/* ------------------------------------------------------------------ */

function RailContent({
  allowed, active, taskCount, incidentCount, collapsed, onNavigate, user, onSignOut, onLock,
}: {
  allowed: Set<string>;
  active: string | null;
  taskCount: number;
  incidentCount: number;
  collapsed: boolean;
  onNavigate: (key: string) => void;
  user: NxUser;
  onSignOut: () => void;
  onLock: () => void;
}) {
  const apps = useMemo(() => APPS.filter((a) => a.system || allowed.has(a.key)), [allowed]);
  const grouped = useMemo(() =>
    GROUP_ORDER.map((g) => ({ group: g, items: apps.filter((a) => a.group === g) })).filter((g) => g.items.length > 0),
    [apps]);

  const badgeFor = (key: string) =>
    key === "tasks" ? taskCount : key === "incidents" ? incidentCount : 0;

  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex h-full flex-col">
      {/* brand */}
      <div className={cn("flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-4", collapsed && "justify-center px-0")}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
          <Activity className="h-4.5 w-4.5" strokeWidth={2.2} />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold leading-tight text-ink">Hospital OS</p>
            <p className="text-[10px] uppercase tracking-widest text-ink-4">Nexura</p>
          </div>
        )}
      </div>

      {/* nav */}
      <nav className="nx-scroll flex-1 overflow-y-auto px-2.5 py-3" aria-label="Hospital OS modules">
        {grouped.map(({ group, items }) => (
          <div key={group} className="mb-3">
            {!collapsed && (
              <p className="mb-1 px-2.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-4">{group}</p>
            )}
            <div className="space-y-0.5">
              {items.map((a) => {
                const isActive = active === a.key;
                const badge = badgeFor(a.key);
                return (
                  <button
                    key={a.key}
                    onClick={() => onNavigate(a.key)}
                    title={collapsed ? a.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] transition-colors",
                      collapsed && "justify-center px-0",
                      isActive ? "bg-accent-soft font-medium text-accent" : "text-ink-2 hover:bg-panel-2 hover:text-ink"
                    )}
                  >
                    {isActive && <span className="absolute left-0 top-1/2 h-4.5 w-0.5 -translate-y-1/2 rounded-full bg-accent" aria-hidden />}
                    <a.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-accent" : "text-ink-3 group-hover:text-ink-2")} strokeWidth={2} />
                    {!collapsed && <span className="truncate">{a.label}</span>}
                    {!collapsed && badge > 0 && (
                      <span className="ml-auto rounded-full bg-crit-soft px-1.5 py-0.5 text-[10px] font-semibold text-crit">{badge}</span>
                    )}
                    {collapsed && badge > 0 && (
                      <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-crit" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* bottom: lock + user */}
      <div className="shrink-0 border-t border-line p-2.5">
        <button
          onClick={onLock}
          title="Lock (⌘L)"
          className={cn("flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] text-ink-3 transition-colors hover:bg-panel-2 hover:text-ink", collapsed && "justify-center px-0")}
        >
          <LockKeyhole className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Lock screen</span>}
        </button>
        <div className={cn("mt-1 flex items-center gap-2.5 rounded-lg p-2", collapsed && "justify-center p-0 py-2")}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-inset text-[11px] font-semibold text-ink-2">{initials}</span>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium leading-tight text-ink">{user.name}</p>
                <p className="truncate text-[10.5px] capitalize text-ink-4">{user.role}{user.department ? ` · ${user.department}` : ""}</p>
              </div>
              <button onClick={onSignOut} title="Sign out" aria-label="Sign out" className="rounded-md p-1.5 text-ink-4 transition-colors hover:bg-panel-2 hover:text-crit">
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => useOs.setState({ railCollapsed: false } as never)}
            className="hidden"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The shell                                                           */
/* ------------------------------------------------------------------ */

export function ConsoleShell({
  user, allowed, demoMode, banner, alertCount, offline, onSignOut, onCaptureTriage,
}: {
  user: NxUser;
  allowed: Set<string>;
  demoMode: boolean;
  banner: { tone: string; text: string } | null;
  alertCount: number;
  offline: boolean;
  onSignOut: () => void;
  onCaptureTriage: () => void;
}) {
  const isMobile = useIsMobile();
  const active = useOs((s) => s.active);
  const openApp = useOs((s) => s.openApp);
  const setPalette = useOs((s) => s.setPalette);
  const setNotif = useOs((s) => s.setNotif);
  const notifOpen = useOs((s) => s.notifOpen);
  const paletteOpen = useOs((s) => s.paletteOpen);
  const notices = useOs((s) => s.notices);

  /* rail collapse is a device-local preference */
  const [railCollapsed, setRailCollapsed] = useState(false);
  useEffect(() => {
    try { setRailCollapsed(localStorage.getItem("nx-rail") === "1"); } catch { /* private mode */ }
  }, []);
  const toggleRail = () => {
    setRailCollapsed((v) => {
      try { localStorage.setItem("nx-rail", v ? "0" : "1"); } catch { /* private mode */ }
      return !v;
    });
  };

  const [drawer, setDrawer] = useState(false);

  /* if the active module left the allowed set, fall back to the first allowed */
  const fallbackKey = useMemo(() => APPS.find((a) => a.system || allowed.has(a.key))?.key ?? "command-center", [allowed]);
  const effectiveActive = active && (appFor(active)?.system || allowed.has(active)) ? active : fallbackKey;

  const app = appFor(effectiveActive)!;
  const unreadLocal = notices.filter((n: NxNotice) => !n.read).length;
  const bellCount = alertCount + unreadLocal;

  const openPatient = (id: string) => {
    window.dispatchEvent(new CustomEvent("nx-open-patient", { detail: id }));
    openApp("patients");
  };
  const appCtx: AppCtx = useMemo(() => ({ open: (k) => openApp(k), openPatient }), [openApp, openPatient]);

  const navigate = (key: string) => { openApp(key); setDrawer(false); };

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* desktop rail */}
      {!isMobile && (
        <aside
          className={cn(
            "relative z-30 shrink-0 border-r border-line bg-panel transition-[width] duration-200",
            railCollapsed ? "w-[64px]" : "w-[240px]"
          )}
        >
          <RailContent
            allowed={allowed} active={effectiveActive} taskCount={alertCount} incidentCount={0}
            collapsed={railCollapsed} onNavigate={navigate} user={user} onSignOut={onSignOut}
            onLock={() => useOs.getState().lock()}
          />
        </aside>
      )}

      {/* mobile drawer */}
      {isMobile && drawer && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={() => setDrawer(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-[272px] border-r border-line bg-panel shadow-[var(--nx-e5)]">
            <button
              onClick={() => setDrawer(false)}
              className="absolute right-2 top-3 z-10 rounded-md p-1.5 text-ink-4 hover:bg-panel-2 hover:text-ink"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <RailContent
              allowed={allowed} active={effectiveActive} taskCount={alertCount} incidentCount={0}
              collapsed={false} onNavigate={navigate} user={user} onSignOut={onSignOut}
              onLock={() => { useOs.getState().lock(); setDrawer(false); }}
            />
          </aside>
        </div>
      )}

      {/* main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel px-4">
          {isMobile && (
            <button onClick={() => setDrawer(true)} className="rounded-md p-1.5 text-ink-2 hover:bg-panel-2 hover:text-ink" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold leading-tight text-ink">{app.label}</h1>
            {!isMobile && <p className="truncate text-[11.5px] leading-tight text-ink-3">{app.desc}</p>}
          </div>

          {demoMode && (
            <span className="hidden items-center gap-1.5 rounded-full border border-warn-line bg-warn-soft px-2.5 py-1 text-[10.5px] font-medium text-warn sm:flex">
              <TriangleAlert className="h-3 w-3" /> Demo — synthetic data
            </span>
          )}
          {offline && (
            <span className="flex items-center gap-1.5 rounded-full border border-warn-line bg-warn-soft px-2.5 py-1 text-[10.5px] font-medium text-warn">
              <WifiOff className="h-3 w-3" /> Offline
            </span>
          )}

          <button
            onClick={() => setPalette(true)}
            className="flex h-8 items-center gap-2 rounded-lg border border-line bg-inset px-2.5 text-[12px] text-ink-3 transition-colors hover:border-line-2 hover:text-ink"
            aria-label="Search (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded border border-line-2 bg-panel px-1 py-0.5 text-[9.5px] text-ink-4 sm:inline">⌘K</kbd>
          </button>

          <button
            onClick={() => setNotif(!notifOpen)}
            className="relative rounded-lg p-2 text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
            aria-label={`Notifications${bellCount ? `, ${bellCount} unread` : ""}`}
          >
            <Bell className="h-4.5 w-4.5" />
            {bellCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-crit px-1 text-[9px] font-bold text-white">
                {bellCount > 9 ? "9+" : bellCount}
              </span>
            )}
          </button>

          {!isMobile && (
            <button
              onClick={toggleRail}
              className="rounded-lg p-2 text-ink-4 transition-colors hover:bg-panel-2 hover:text-ink"
              aria-label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {railCollapsed ? <PanelLeftOpen className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
            </button>
          )}
        </header>

        {/* platform banners (incident / maintenance) */}
        {banner && (
          <div className={cn(
            "flex items-center justify-center gap-2 px-4 py-1.5 text-[11.5px] font-medium",
            banner.tone === "crit" ? "bg-crit-soft text-crit" : "bg-warn-soft text-warn"
          )} aria-live="polite">
            <TriangleAlert className="h-3.5 w-3.5" /> {banner.text}
          </div>
        )}

        {/* offline triage affordance */}
        {offline && (
          <div className="flex flex-wrap items-center justify-center gap-2 bg-warn-soft px-4 py-1.5 text-[11.5px] font-medium text-warn">
            <WifiOff className="h-3.5 w-3.5" />
            Offline — showing cached data. Critical triage stays available.
            <button
              className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold underline underline-offset-2"
              onClick={onCaptureTriage}
            >
              Capture triage
            </button>
            <span id="nx-offline-pending" />
          </div>
        )}

        {/* content pane — one module at a time */}
        <main className="nx-scroll relative min-h-0 flex-1 overflow-y-auto" role="main">
          <div key={effectiveActive} className="nx-console-pane">
            {app.render(appCtx)}
          </div>
        </main>
      </div>

      {/* overlays */}
      <NxPalette allowed={allowed} onSignOut={onSignOut} />
      {notifOpen && <NxNotificationCenter />}
      {isMobile && <NxBackFab />}
      <NxBackSync enabled />
      <span className="hidden"><ChevronLeft /><ChevronRight /></span>
    </div>
  );
}
