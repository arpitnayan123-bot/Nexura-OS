"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster } from "sonner";
import {
  Command as CommandIcon, Expand, FlaskConical, Layers, LayoutGrid, Settings, SquareStack, TriangleAlert, Wallpaper as WallpaperIcon, WifiOff,
} from "lucide-react";
import { useNx, nx, useNxStream, type NxStreamEvent } from "./client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NxLogin } from "./nx-login";
import { NxBoot } from "./os/boot";
import { NxLock } from "./os/lock";
import { NxDesktop } from "./os/desktop";
import { NxWindowManager, useIsMobile } from "./os/wm";
import { NxSystemBar } from "./os/system-bar";
import { NxDock } from "./os/dock";
import { NxLauncher } from "./os/launcher";
import { NxPalette } from "./os/palette";
import { NxSwitcher } from "./os/switcher";
import { CtxMenu, type CtxItem } from "./os/ctx";
import { APPS, appFor, type AppCtx } from "./os/registry";
import { WS_COUNT, useOs, type Wallpaper } from "./os/store";
import { NxBackSync, NxBackFab } from "./os/back-ui";
import { useBack, useNxHistoryBridge } from "./os/back";

/* ============================================================
   HOSPITAL OS — desktop orchestrator
   Boot → session → theme → stage (widgets + windows + overview),
   system bar, dock, launcher, palette, switcher, lock, notices,
   workspaces and the global keyboard system.
   ============================================================ */

type NxUser = { id: string; name: string; role: string; department?: string; hospitalId?: string };

const WALLPAPER_ORDER: Wallpaper[] = ["aurora", "dawn", "meadow", "mono"];

export function NxApp() {
  const [signedOut, setSignedOut] = useState(false);
  const [tick, setTick] = useState(0);
  const [online, setOnline] = useState(true);
  const isMobile = useIsMobile();

  const { data: session, loading: sessionLoading } = useNx<{ user: NxUser | null; modules?: string[] }>(
    signedOut ? null : `/api/nx/auth?v=${tick}`
  );
  const user: NxUser | null = signedOut ? null : session?.user || null;

  const os = useOs();

  /* ---------- universal back: device/browser back walks in-app layers ---------- */
  const backGate = useCallback(() => !useOs.getState().locked, []);
  useNxHistoryBridge(true, backGate);

  /* ---------- boot: minimum splash duration, then fade ---------- */
  const [bootMin, setBootMin] = useState(false);
  const [bootGone, setBootGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBootMin(true), 1150);
    return () => clearTimeout(t);
  }, []);
  const booting = sessionLoading || !bootMin;
  useEffect(() => {
    if (booting) return;
    const t = setTimeout(() => setBootGone(true), 430);
    return () => clearTimeout(t);
  }, [booting]);

  /* ---------- theme: resolve auto → light/dark ---------- */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = os.theme === "auto" ? (mq.matches ? "dark" : "light") : os.theme;
      os.setResolved(resolved);
      /* portal surfaces (dialogs, menus, toasts) render outside .nx-root —
         mirror theme + accent onto <html> so they resolve the same tokens */
      const html = document.documentElement;
      html.classList.toggle("dark", resolved === "dark");      // site/shadcn tokens
      html.classList.toggle("nx-dark", resolved === "dark");   // OS tokens (dark set)
      html.classList.toggle("nx-light", resolved === "light"); // OS tokens (light set)
      html.setAttribute("data-nx-accent", os.accent);
    };
    queueMicrotask(apply); // lint-safe: no sync external-store write in effect body
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [os.theme, os.accent, os.setResolved]);

  /* ---------- connectivity ---------- */
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    queueMicrotask(() => setOnline(navigator.onLine));
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  /* ---------- keep windows inside the stage on resize ---------- */
  useEffect(() => {
    const onResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = useOs.getState();
      for (const w of s.wins) {
        if (w.max) { s.setGeom(w.key, { x: 0, y: 0, w: vw, h: vh - 46 }); continue; }
        const x = Math.min(Math.max(w.x, -w.w + 120), Math.max(0, vw - 120));
        const y = Math.min(Math.max(w.y, 0), Math.max(0, vh - 46 - 84 - 44));
        const width = Math.min(w.w, vw);
        const height = Math.min(w.h, vh - 46);
        if (x !== w.x || y !== w.y || width !== w.w || height !== w.h) {
          s.setGeom(w.key, { x, y, w: width, h: height });
        }
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ---------- live alert counts → system badges + notices ---------- */
  const { data: taskData } = useNx<{ counts: { critical: number; overdue: number } }>(
    user ? "/api/nx/tasks?status=active" : null, { pollMs: 30000 }
  );
  const { data: incidentData } = useNx<{ counts: { critical: number; open: number } }>(
    user ? "/api/nx/incidents?status=open,acknowledged,investigating" : null, { pollMs: 30000 }
  );
  const taskCritical = taskData?.counts.critical ?? 0;
  const incidentCritical = incidentData?.counts.critical ?? 0;

  const prevAlerts = useRef<{ t: number; i: number } | null>(null);
  useEffect(() => {
    if (!user) { prevAlerts.current = null; return; }
    const prev = prevAlerts.current;
    prevAlerts.current = { t: taskCritical, i: incidentCritical };
    if (!prev) return;
    if (incidentCritical > prev.i) {
      os.pushNotice({ title: "Critical incident reported", body: `${incidentCritical} critical incidents now open.`, tone: "crit", moduleKey: "incidents" });
    }
    if (taskCritical > prev.t) {
      os.pushNotice({ title: "Critical task needs attention", body: `${taskCritical} critical tasks in the work queue.`, tone: "warn", moduleKey: "tasks" });
    }
  }, [taskCritical, incidentCritical, user, os.pushNotice]);

  /* ---------- welcome notice per session ---------- */
  const welcomed = useRef(false);
  useEffect(() => {
    if (!user || welcomed.current) return;
    welcomed.current = true;
    os.pushNotice({
      title: `Welcome back, ${user.name.split(" ")[0]}`,
      body: "⌘K commands · ⌘J apps · F9 overview · ⌘L lock",
      tone: "info",
    });
  }, [user, os.pushNotice]);

  /* ---------- Nexura platform: system status banners (incident / maintenance / demo) ---------- */
  const { data: sysStatus } = useNx<{ status: Record<string, { enabled: boolean; message: string | null; severity: string }> }>(
    user ? "/api/nx/system-status" : null, { pollMs: 60000 }
  );
  const banner = sysStatus?.status?.incident_banner?.enabled
    ? { tone: sysStatus.status.incident_banner.severity === "critical" ? "crit" : "warn", text: sysStatus.status.incident_banner.message || "Platform incident — some features may be degraded." }
    : sysStatus?.status?.maintenance_mode?.enabled
      ? { tone: "warn", text: sysStatus.status.maintenance_mode.message || "Maintenance mode active — data entry is discouraged." }
      : null;

  /* ---------- real-time stream: live events → notices + badge refresh ---------- */
  const bump = useCallback(() => setTick((t) => t + 1), []);
  const stream = useNxStream({
    enabled: Boolean(user),
    onEvent: (ev: NxStreamEvent) => {
      const d = (ev.data ?? {}) as Record<string, string>;
      switch (ev.event) {
        case "lab.critical":
          toast.error(`Critical lab: ${d.test ?? "result"}`, { description: d.patient ?? undefined });
          os.pushNotice({ title: "Critical lab result", body: `${d.test ?? "Result"} — ${d.patient ?? ""}`, tone: "crit", moduleKey: "labs" });
          bump();
          break;
        case "message.new":
          if (d.severity === "urgent") {
            os.pushNotice({ title: `Urgent message from ${d.sender ?? "care team"}`, body: d.preview ?? "", tone: "warn", moduleKey: "messages" });
          }
          bump();
          break;
        case "task.created":
        case "task.updated":
        case "notification.new":
          bump();
          break;
        case "bed.updated":
          bump();
          break;
        default:
          break;
      }
    },
  });
  const demoMode = (session as { demo?: boolean } | undefined)?.demo ?? true;

  /* ---------- global keyboard system ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useOs.getState();
      if (s.locked) return; // the lock screen owns the keyboard

      /* app switcher owns the keyboard while open */
      if (s.switcherOpen) {
        if (e.key === "Tab" || e.key === "`" || e.code === "Backquote" || e.key === "ArrowRight") {
          e.preventDefault();
          s.cycleSwitcher(e.shiftKey ? -1 : 1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          s.cycleSwitcher(-1);
        } else if (e.key === "Enter") {
          e.preventDefault();
          s.confirmSwitcher();
        } else if (e.key === "Escape") {
          e.preventDefault();
          s.cancelSwitcher();
        }
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      const typing =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable);

      if (e.altKey && e.key === "Tab") { e.preventDefault(); s.openSwitcher(); return; }
      if (mod && (e.key === "`" || e.code === "Backquote")) { e.preventDefault(); s.openSwitcher(); return; }
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); s.setPalette(!s.paletteOpen); return; }
      if (mod && e.key.toLowerCase() === "j") { e.preventDefault(); s.setLauncher(!s.launcherOpen); return; }
      if (mod && e.key.toLowerCase() === "l") { e.preventDefault(); s.lock(); return; }
      if (mod && e.key.toLowerCase() === "m" && s.focused) { e.preventDefault(); s.minimizeApp(s.focused); return; }
      if (mod && e.key.toLowerCase() === "w" && s.focused) { e.preventDefault(); s.closeApp(s.focused); return; }
      if (e.key === "F9" && !typing) { e.preventDefault(); s.setOverview(!s.overviewOpen); return; }
      if (e.ctrlKey && e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        s.setWorkspace(s.workspace + (e.key === "ArrowRight" ? 1 : -1));
        return;
      }
      if (e.ctrlKey && e.altKey && /^[1-3]$/.test(e.key)) {
        e.preventDefault();
        s.setWorkspace(parseInt(e.key, 10));
        return;
      }
      if (e.key === "?" && !typing && !s.launcherOpen && !s.paletteOpen && !s.quickOpen && !s.notifOpen) {
        e.preventDefault();
        s.openApp("settings");
        return;
      }
      if (e.key === "Escape") {
        const back = useBack.getState();
        const top = back.stack[back.stack.length - 1];
        /* while typing, never dismiss a whole window — only views/overlays */
        if (typing && top?.kind === "window") return;
        if (back.stack.length > 0) { back.goBack(); return; }
        if (s.notifOpen || s.quickOpen) s.closeOverlays();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- desktop context menu ---------- */
  const [deskMenu, setDeskMenu] = useState<{ x: number; y: number } | null>(null);
  const openDeskMenu = useCallback((e: React.MouseEvent) => {
    if (window.matchMedia("(max-width: 767px)").matches) return;
    if ((e.target as HTMLElement).closest(".nx-win")) return; // windows handle their own
    e.preventDefault();
    setDeskMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const deskMenuItems = useMemo<CtxItem[]>(() => {
    const s = useOs.getState();
    const nextWall = WALLPAPER_ORDER[(WALLPAPER_ORDER.indexOf(s.wallpaper) + 1) % WALLPAPER_ORDER.length];
    return [
      { label: "Open Launchpad", icon: LayoutGrid, kbd: "⌘J", onSelect: () => useOs.getState().setLauncher(true) },
      { label: "Command palette", icon: CommandIcon, kbd: "⌘K", onSelect: () => useOs.getState().setPalette(true) },
      { label: "Show all windows", icon: Expand, kbd: "F9", onSelect: () => useOs.getState().setOverview(true) },
      {
        label: "Arrange windows",
        icon: Layers,
        disabled: s.wins.filter((w) => w.ws === s.workspace && !w.min).length === 0,
        onSelect: () => arrangeWindows(),
      },
      { kind: "sep" },
      { kind: "label", label: "Workspaces" },
      ...Array.from({ length: WS_COUNT }, (_, i) => i + 1).map((ws) => ({
        label: `Workspace ${ws}`,
        icon: SquareStack,
        checked: s.workspace === ws,
        onSelect: () => useOs.getState().setWorkspace(ws),
      })),
      { kind: "sep" },
      { label: `Wallpaper: ${nextWall}`, icon: WallpaperIcon, onSelect: () => useOs.getState().setWallpaper(nextWall) },
      { label: "Appearance settings", icon: Settings, onSelect: () => useOs.getState().openApp("settings") },
    ];
  }, [deskMenu]);

  /* ---------- deep link #m=key ---------- */
  useEffect(() => {
    const hash = window.location.hash.replace("#m=", "");
    if (hash && appFor(hash)) queueMicrotask(() => useOs.getState().openApp(hash));
  }, []);

  /* ---------- app context ---------- */
  const openPatient = useCallback((id: string) => {
    window.dispatchEvent(new CustomEvent("nx-open-patient", { detail: id }));
    useOs.getState().openApp("patients");
  }, []);

  const appCtx: AppCtx = useMemo(() => ({ open: (k) => useOs.getState().openApp(k), openPatient }), [openPatient]);

  /* ---------- sign out ---------- */
  async function signOut() {
    await nx("/api/nx/auth", { method: "DELETE" }).catch(() => null);
    useBack.setState({ stack: [], armedAt: 0 });
    useOs.getState().closeOverlays();
    useOs.getState().unlock();
    setSignedOut(true);
  }

  /* ---------- boot splash ---------- */
  if (!bootGone) {
    return (
      <div className="nx-root" data-theme="dark" data-accent={os.accent} data-wall={os.wallpaper}>
        <NxBoot leaving={!booting} />
      </div>
    );
  }

  /* ---------- login ---------- */
  if (!user) {
    return (
      <div className="nx-root" data-theme={os.resolvedTheme} data-accent={os.accent} data-wall={os.wallpaper} data-motion={os.motion}>
        <NxLogin
          onSignedIn={(u) => {
            setSignedOut(false);
            setTick((t) => t + 1);
            const landing = u.role === "doctor" ? "doctor" : u.role === "nurse" ? "nurse" : u.role === "lab" ? "labs" : u.role === "pharmacist" ? "pharmacy" : u.role === "leadership" ? "analytics" : "command-center";
            queueMicrotask(() => useOs.getState().openApp(landing));
          }}
        />
        <Toaster theme={os.resolvedTheme} position="top-right" />
      </div>
    );
  }

  /* ---------- allowed modules (RBAC) ---------- */
  const modules = session?.modules || [];
  const allowed = new Set<string>(
    user.role === "admin" ? APPS.filter((a) => !a.system).map((a) => a.key) : modules
  );

  const alertCount = taskCritical + incidentCritical;

  return (
    <div
      className="nx-root"
      data-theme={os.resolvedTheme}
      data-accent={os.accent}
      data-density={os.density}
      data-motion={os.motion}
      data-night={os.night ? "true" : "false"}
      data-wall={os.wallpaper}
    >
      <NxSystemBar
        user={{ name: user.name, role: user.role, department: user.department }}
        alertCount={alertCount}
        offline={!online}
        onSignOut={signOut}
      />

      {/* demo + incident/maintenance banners */}
      {(demoMode || banner) && (
        <div className="pointer-events-none absolute left-1/2 top-[46px] z-[52] flex -translate-x-1/2 flex-col items-center gap-1 pt-1.5" aria-live="polite">
          {banner && (
            <div className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-1 text-[11.5px] font-medium backdrop-blur",
              banner.tone === "crit" ? "border-crit-line bg-crit-soft text-crit" : "border-warn-line bg-warn-soft text-warn"
            )}>
              <TriangleAlert className="h-3.5 w-3.5" />
              {banner.text}
            </div>
          )}
          {demoMode && (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-[10.5px] font-medium text-amber-500 backdrop-blur">
              <FlaskConical className="h-3 w-3" /> Demo environment — synthetic data
            </div>
          )}
        </div>
      )}

      {/* stage */}
      <main
        className="relative min-h-0 flex-1"
        role="main"
        onPointerDown={(e) => { if (e.target === e.currentTarget) useOs.getState().closeOverlays(); }}
        onContextMenu={openDeskMenu}
      >
        <NxDesktop />
        <NxWindowManager appCtx={appCtx} />
        <NxBackSync enabled={Boolean(user)} />
        {isMobile && <NxBackFab />}

        {/* offline banner */}
        {!online && (
          <div className="absolute bottom-20 left-1/2 z-[56] flex -translate-x-1/2 items-center gap-2 rounded-full border border-warn-line bg-warn-soft px-4 py-1.5 text-[12px] font-medium text-warn backdrop-blur">
            <WifiOff className="h-3.5 w-3.5" />
            Offline — windows show cached data. Reconnecting… (last sync {stream.lastSyncedAt ? new Date(stream.lastSyncedAt).toLocaleTimeString("en-IN") : "—"})
          </div>
        )}
      </main>

      <NxDock taskCount={taskCritical} incidentCount={incidentCritical} />

      {os.launcherOpen && <NxLauncher allowed={allowed} />}
      <NxPalette allowed={allowed} onSignOut={signOut} />
      {os.switcherOpen && <NxSwitcher />}
      {os.locked && (
        <NxLock user={{ name: user.name, role: user.role, department: user.department }} onSignOut={signOut} />
      )}
      {deskMenu && <CtxMenu x={deskMenu.x} y={deskMenu.y} items={deskMenuItems} onClose={() => setDeskMenu(null)} />}

      <Toaster
        theme={os.resolvedTheme}
        position={isMobile ? "top-center" : "bottom-right"}
        offset={isMobile ? 56 : 96}
        visibleToasts={isMobile ? 1 : 3}
      />
    </div>
  );
}

/* cascade-tile the visible windows on the current workspace */
function arrangeWindows() {
  const s = useOs.getState();
  const list = s.wins.filter((w) => w.ws === s.workspace && !w.min && !w.max);
  if (list.length === 0) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight - 46 - 84;
  const cols = Math.ceil(Math.sqrt(list.length));
  const rows = Math.ceil(list.length / cols);
  const gap = 14;
  const w = Math.floor((vw - gap * (cols + 1)) / cols);
  const h = Math.floor((vh - gap * (rows + 1)) / rows);
  list.forEach((win, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    s.setGeom(win.key, {
      x: gap + col * (w + gap),
      y: gap + row * (h + gap),
      w,
      h,
    }, true);
    if (win.max) s.toggleMax(win.key);
  });
}
