"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity, ArrowLeft, BatteryMedium, Bell, BellRing, ChevronDown, Grid2x2, LockKeyhole, LogOut,
  Moon, Settings, UserRound, Wifi, WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WS_COUNT, useOs } from "./store";
import { NxBackPill } from "./back-ui";
import { NxNotificationCenter } from "./notifications";
import { NxQuickSettings } from "./quick-settings";
import { NxCalendarPop } from "./calendar-pop";
import { useNow } from "./use-now";

/* ============================================================
   HOSPITAL OS — system bar
   Brand · focused app context · workspaces · status tray ·
   notifications · clock/calendar · quick settings · user
   ============================================================ */

export interface BarUser { name: string; role: string; department?: string }

export function NxSystemBar({ user, alertCount, offline, onSignOut }: {
  user: BarUser;
  alertCount: number;
  offline: boolean;
  onSignOut: () => void;
}) {
  const focused = useOs((s) => s.focused);
  const focusedKey = useOs((s) => {
    const w = s.wins.find((x) => x.key === s.focused);
    return w ? w.key : null;
  });
  const notifOpen = useOs((s) => s.notifOpen);
  const quickOpen = useOs((s) => s.quickOpen);
  const setNotif = useOs((s) => s.setNotif);
  const setQuick = useOs((s) => s.setQuick);
  const openApp = useOs((s) => s.openApp);
  const focusMode = useOs((s) => s.focus);

  /* label lookup kept out of selector to avoid object deps */
  const label = useFocusedLabel(focusedKey);

  return (
    <header className="nx-bar nx-sheen" role="banner">
      {/* brand */}
      <button
        onClick={() => openApp("command-center")}
        className="nx-bar-item font-semibold text-ink"
        aria-label="Hospital OS — open Command Center"
      >
        <span className="nx-brand-glyph">
          <Activity className="h-3.5 w-3.5" />
        </span>
        <span className="nx-display hidden text-[13.5px] sm:block">Hospital OS</span>
      </button>

      <NexuraProductSwitcher />

      {/* universal back — one tap to the previous screen */}
      <NxBackPill />

      {/* focused app context */}
      <div className="hidden min-w-0 items-center gap-2 md:flex">
        <span className="h-4 w-px bg-line-2" />
        <span className="truncate text-[12px] text-ink-3">{label || "Desktop"}</span>
      </div>

      <WorkspacePills />

      {/* left cluster done — tray lives right */}
      <div className="ml-auto flex items-center gap-1">
        {offline ? (
          <span className="nx-bar-item text-crit">
            <WifiOff className="h-3.5 w-3.5" />
            <span className="hidden text-[11.5px] lg:block">Offline</span>
          </span>
        ) : (
          <span className="nx-bar-item" title="Connected — live data, 30s polling">
            <Wifi className="h-3.5 w-3.5 text-good" />
          </span>
        )}
        <span className="nx-bar-item hidden xl:flex" title="Workstation battery — 84%">
          <BatteryMedium className="h-4 w-4 text-good" />
          <span className="text-[11px] tabular-nums text-ink-3">84%</span>
        </span>
        {focusMode && (
          <span className="nx-bar-item text-vio" title="Focus mode is on — non-critical alerts are quiet">
            <Moon className="h-3.5 w-3.5" />
            <span className="hidden text-[11.5px] lg:block">Focus</span>
          </span>
        )}

        {/* notifications */}
        <button
          className={cn("nx-bar-item relative", notifOpen && "text-ink")}
          onClick={() => setNotif(!notifOpen)}
          aria-expanded={notifOpen}
          aria-label={`Notifications${alertCount ? `, ${alertCount} critical` : ""}`}
        >
          {alertCount > 0 ? <BellRing className="h-4 w-4 text-crit" /> : <Bell className="h-4 w-4" />}
          {alertCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-crit px-1 text-[9px] font-bold text-white">
              {alertCount}
            </span>
          )}
        </button>

        {/* clock + calendar */}
        <BarClock />

        {/* quick settings */}
        <button
          className={cn("nx-bar-item", quickOpen && "text-ink")}
          onClick={() => setQuick(!quickOpen)}
          aria-expanded={quickOpen}
          aria-label="Quick settings"
        >
          <span className="flex h-4 w-4 flex-col justify-center gap-[3px]">
            <span className={cn("h-[2px] w-4 rounded-full transition", quickOpen ? "bg-accent" : "bg-ink-3")} />
            <span className={cn("h-[2px] w-4 rounded-full transition", quickOpen ? "bg-accent" : "bg-ink-3")} />
            <span className={cn("h-[2px] w-4 rounded-full transition", quickOpen ? "bg-accent" : "bg-ink-3")} />
          </span>
        </button>

        {/* user */}
        <UserChip user={user} onSignOut={onSignOut} />
      </div>

      {/* anchored popovers */}
      {notifOpen && <NxNotificationCenter />}
      {quickOpen && <NxQuickSettings />}
    </header>
  );
}

function useFocusedLabel(key: string | null) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!key) { setLabel(null); return; }
    import("./registry").then(({ appFor }) => setLabel(appFor(key)?.label ?? null));
  }, [key]);
  return label;
}

/* ---------------- workspace switcher ---------------- */

function WorkspacePills() {
  const workspace = useOs((s) => s.workspace);
  const setWorkspace = useOs((s) => s.setWorkspace);
  const wins = useOs((s) => s.wins);
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  if (!desktop) return null;

  return (
    <div className="nx-ws ml-1" role="tablist" aria-label="Workspaces">
      {Array.from({ length: WS_COUNT }, (_, i) => i + 1).map((ws) => {
        const count = wins.filter((w) => w.ws === ws).length;
        return (
          <button
            key={ws}
            role="tab"
            aria-selected={workspace === ws}
            className="nx-ws-pill"
            data-on={workspace === ws}
            onClick={() => setWorkspace(ws)}
            aria-label={`Workspace ${ws}${count ? `, ${count} window${count === 1 ? "" : "s"}` : ", empty"}`}
            title={`Workspace ${ws}`}
          >
            {ws}
            {count > 0 && workspace !== ws && <span className="nx-ws-dot" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- clock + calendar ---------------- */

function BarClock() {
  const now = useNow(15_000);
  const [calOpen, setCalOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calOpen) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setCalOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [calOpen]);

  return (
    <div className="relative" ref={ref}>
      <button
        className="nx-bar-item tabular-nums"
        onClick={() => setCalOpen((v) => !v)}
        aria-expanded={calOpen}
        aria-label={`Calendar — ${now ? now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""}`}
        title="Indian Standard Time"
      >
        <span className="hidden text-[12.5px] font-medium text-ink sm:block">
          {now ? now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--"}
        </span>
        <span className="hidden text-[11.5px] text-ink-3 lg:block">
          {now ? now.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
        </span>
      </button>
      {calOpen && <NxCalendarPop />}
    </div>
  );
}

/* ---------------- user chip ---------------- */

function UserChip({ user, onSignOut }: { user: BarUser; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const openApp = useOs((s) => s.openApp);
  const lock = useOs((s) => s.lock);
  const initials = user.name.split(" ").map((n) => n[0]).slice(0, 2).join("");

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        className="nx-bar-item gap-2"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-[10px] font-bold text-accent">
          {initials}
        </span>
        <span className="hidden max-w-28 truncate text-[12px] text-ink md:block">{user.name}</span>
        <ChevronDown className={cn("h-3 w-3 text-ink-4 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="nx-pop right-1.5 top-[calc(100%+6px)] w-60 p-1.5" role="menu">
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-[13px] font-semibold text-ink">{user.name}</p>
            <p className="truncate text-[11px] capitalize text-ink-3">{user.role} · {user.department || "—"}</p>
          </div>
          <button
            role="menuitem"
            className="nx-bar-item w-full justify-start text-ink-2"
            onClick={() => { setOpen(false); openApp("settings"); }}
          >
            <Settings className="h-3.5 w-3.5" /> System Settings
          </button>
          <button
            role="menuitem"
            className="nx-bar-item w-full justify-start text-ink-2"
            onClick={() => { setOpen(false); lock(); }}
          >
            <LockKeyhole className="h-3.5 w-3.5" /> Lock screen
            <kbd className="ml-auto rounded border border-line-2 bg-inset px-1.5 py-0.5 text-[9.5px] text-ink-4">⌘L</kbd>
          </button>
          <button
            role="menuitem"
            className="nx-bar-item w-full justify-start text-ink-2 hover:!text-crit"
            onClick={() => { setOpen(false); onSignOut(); }}
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
          <div className="border-t border-line px-3 pb-1.5 pt-2">
            <Link href="/" className="flex items-center gap-2 text-[11px] text-ink-4 transition hover:text-ink-2">
              <ArrowLeft className="h-3 w-3" /> nexura.health homepage
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}


/* ============================================================
   NEXURA OS PLATFORM — product switcher
   Hospital OS as a first-class product inside the Nexura OS
   ecosystem: switch to the marketing site, patient portal,
   pharmacy, clinic suite or global network console.
   ============================================================ */

const NEXURA_PRODUCTS = [
  { href: "/", label: "Nexura OS Home", desc: "Platform overview", external: false },
  { href: "/connect", label: "Nexura Connect", desc: "Teleconsult & patient chat", external: false },
  { href: "/portal", label: "Patient Portal", desc: "Records, reports, family", external: false },
  { href: "/pharmacy", label: "Pharmacia", desc: "Retail pharmacy OS", external: false },
  { href: "/clinic", label: "Clinic Suite", desc: "OPD clinics", external: false },
  { href: "/global", label: "Global Network", desc: "Multi-hospital console", external: false },
];

function NexuraProductSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        className="nx-bar-item text-ink-3"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Switch Nexura product"
        title="Nexura OS products"
        onClick={() => setOpen((v) => !v)}
      >
        <Grid2x2 className="h-3.5 w-3.5" />
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div className="nx-pop left-1.5 top-[calc(100%+6px)] w-[min(300px,calc(100vw-16px))] p-1.5" role="menu" aria-label="Nexura products">
          <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4">Nexura OS · products</p>
          {NEXURA_PRODUCTS.map((p) => (
            <a
              key={p.href}
              href={p.href}
              role="menuitem"
              className="flex items-center justify-between rounded-xl px-2.5 py-2 transition hover:bg-inset"
              onClick={() => setOpen(false)}
            >
              <span>
                <span className="block text-[12.5px] font-medium text-ink">{p.label}</span>
                <span className="block text-[10.5px] text-ink-4">{p.desc}</span>
              </span>
              <ArrowLeft className="h-3.5 w-3.5 rotate-180 text-ink-4" />
            </a>
          ))}
          <p className="border-t border-line px-2.5 pb-1 pt-2 text-[10px] leading-relaxed text-ink-4">
            Unified identity · shared notifications · audit across products
          </p>
        </div>
      )}
    </div>
  );
}
