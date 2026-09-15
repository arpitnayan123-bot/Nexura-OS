"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity } from "lucide-react";
import { useNx, nx, useNxStream, type NxStreamEvent } from "./client";
import { toast } from "sonner";
import { NxLogin } from "./nx-login";
import { NxLock } from "./os/lock";
import { ConsoleShell } from "./os/console";
import { APPS, appFor } from "./os/registry";
import { useOs } from "./os/store";
import { useBack, useNxHistoryBridge } from "./os/back";
import { installOfflineAutoFlush, queueOp } from "@/lib/nx-client/offline";

/* ============================================================
   HOSPITAL OS — console orchestrator

   Session → sign-in → console. The fake desktop (boot theater,
   windows, workspaces, dock, launcher, switcher, wallpapers) is
   retired: what remains is a calm, labeled hospital console.
   Kept from the previous shell: session/RBAC, live SSE alerts,
   offline triage buffer, platform status banners, ⌘K palette,
   ⌘L lock, device-back bridge and the full module registry.
   ============================================================ */

type NxUser = { id: string; name: string; role: string; department?: string; hospitalId?: string };

const LANDING_BY_ROLE: Record<string, string> = {
  doctor: "doctor",
  nurse: "nurse",
  lab: "labs",
  pharmacist: "pharmacy",
  leadership: "analytics",
};

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--nx-void)]">
      <div className="flex flex-col items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent">
          <Activity className="h-5.5 w-5.5 animate-pulse" strokeWidth={2.2} />
        </span>
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-4">Hospital OS</p>
      </div>
    </div>
  );
}

export function NxApp() {
  const [signedOut, setSignedOut] = useState(false);
  const [online, setOnline] = useState(true);

  // Stable URL — the session is fetched once per mount and refetched via
  // refresh() after auth transitions.
  const { data: session, loading: sessionLoading, refresh: refreshSession } = useNx<{ user: NxUser | null; modules?: string[]; demo?: boolean }>(
    signedOut ? null : "/api/nx/auth"
  );
  const user: NxUser | null = signedOut ? null : session?.user || null;

  const theme = useOs((s) => s.theme);
  const accent = useOs((s) => s.accent);
  const resolvedTheme = useOs((s) => s.resolvedTheme);
  const density = useOs((s) => s.density);
  const motion = useOs((s) => s.motion);
  const night = useOs((s) => s.night);
  const locked = useOs((s) => s.locked);
  const setResolved = useOs((s) => s.setResolved);
  const pushNotice = useOs((s) => s.pushNotice);

  /* ---------- universal back: device/browser back walks in-app layers ---------- */
  const backGate = useCallback(() => !useOs.getState().locked, []);
  useNxHistoryBridge(true, backGate);

  /* ---------- theme: resolve auto → light/dark ---------- */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "auto" ? (mq.matches ? "dark" : "light") : theme;
      setResolved(resolved);
      /* portal surfaces (dialogs, menus, toasts) render outside .nx-root —
         mirror theme + accent onto <html> so they resolve the same tokens */
      const html = document.documentElement;
      html.classList.toggle("dark", resolved === "dark");
      html.classList.toggle("nx-dark", resolved === "dark");
      html.classList.toggle("nx-light", resolved === "light");
      html.setAttribute("data-nx-accent", accent);
    };
    queueMicrotask(apply); // lint-safe: no sync external-store write in effect body
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme, accent, setResolved]);

  /* ---------- connectivity + offline write buffer ---------- */
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    queueMicrotask(() => setOnline(navigator.onLine));
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const uninstall = installOfflineAutoFlush();
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); uninstall(); };
  }, []);

  /* ---------- locale + device mode boot from settings ---------- */
  useEffect(() => {
    try {
      const locale = localStorage.getItem("nx-locale");
      if (locale) document.documentElement.lang = locale;
      const mode = localStorage.getItem("nx-mode");
      if (mode) document.documentElement.dataset.nxMode = mode;
    } catch { /* private mode */ }
  }, []);

  /* ---------- live alert counts → rail badges + notices ---------- */
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
      pushNotice({ title: "Critical incident reported", body: `${incidentCritical} critical incidents now open.`, tone: "crit", moduleKey: "incidents" });
    }
    if (taskCritical > prev.t) {
      pushNotice({ title: "Critical task needs attention", body: `${taskCritical} critical tasks in the work queue.`, tone: "warn", moduleKey: "tasks" });
    }
  }, [taskCritical, incidentCritical, user, pushNotice]);

  /* ---------- welcome notice per session ---------- */
  const welcomed = useRef(false);
  useEffect(() => {
    if (!user || welcomed.current) return;
    welcomed.current = true;
    pushNotice({
      title: `Welcome back, ${user.name.split(" ")[0]}`,
      body: "⌘K to search patients, modules and commands · ⌘L to lock",
      tone: "info",
    });
  }, [user, pushNotice]);

  /* ---------- platform status banners ---------- */
  const { data: sysStatus } = useNx<{ status: Record<string, { enabled: boolean; message: string | null; severity: string }> }>(
    user ? "/api/nx/system-status" : null, { pollMs: 60000 }
  );
  const banner = sysStatus?.status?.incident_banner?.enabled
    ? { tone: sysStatus.status.incident_banner.severity === "critical" ? "crit" : "warn", text: sysStatus.status.incident_banner.message || "Platform incident — some features may be degraded." }
    : sysStatus?.status?.maintenance_mode?.enabled
      ? { tone: "warn", text: sysStatus.status.maintenance_mode.message || "Maintenance mode active — data entry is discouraged." }
      : null;

  /* ---------- live stream → notices ---------- */
  useNxStream({
    enabled: Boolean(user),
    onEvent: (ev: NxStreamEvent) => {
      const d = (ev.data ?? {}) as Record<string, string>;
      switch (ev.event) {
        case "lab.critical":
          toast.error(`Critical lab: ${d.test ?? "result"}`, { description: d.patient ?? undefined });
          pushNotice({ title: "Critical lab result", body: `${d.test ?? "Result"} — ${d.patient ?? ""}`, tone: "crit", moduleKey: "labs" });
          break;
        case "message.new":
          if (d.severity === "urgent") {
            pushNotice({ title: `Urgent message from ${d.sender ?? "care team"}`, body: d.preview ?? "", tone: "warn", moduleKey: "messages" });
          }
          break;
        default:
          break;
      }
    },
  });
  const demoMode = session?.demo ?? false;

  /* ---------- global keyboard: palette, lock, escape ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useOs.getState();
      if (s.locked) return;

      const mod = e.metaKey || e.ctrlKey;
      const typing =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable);

      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); s.setPalette(!s.paletteOpen); return; }
      if (mod && e.key.toLowerCase() === "l") { e.preventDefault(); s.lock(); return; }
      if (e.key === "?" && !typing && !s.paletteOpen && !s.quickOpen && !s.notifOpen) {
        e.preventDefault();
        s.openApp("settings");
        return;
      }
      if (e.key === "Escape") {
        const back = useBack.getState();
        const top = back.stack[back.stack.length - 1];
        if (typing && top?.kind === "window") return;
        if (back.stack.length > 0) { back.goBack(); return; }
        if (s.notifOpen || s.quickOpen || s.paletteOpen) s.closeOverlays();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- deep link #m=key (also reacts to same-document hash changes) ---------- */
  useEffect(() => {
    const go = () => {
      const hash = window.location.hash.replace("#m=", "");
      if (hash && appFor(hash)) queueMicrotask(() => useOs.getState().openApp(hash));
    };
    go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);

  /* ---------- sign out ---------- */
  async function signOut() {
    await nx("/api/nx/auth", { method: "DELETE" }).catch(() => null);
    useBack.setState({ stack: [], armedAt: 0 });
    useOs.getState().closeOverlays();
    useOs.getState().unlock();
    setSignedOut(true);
  }

  /* ---------- offline triage capture ---------- */
  const captureTriage = useCallback(async () => {
    const uhid = window.prompt("Patient UHID (if known — leave blank for unknown):") ?? "";
    const complaint = window.prompt("Presenting complaint:") ?? "";
    if (!complaint) return;
    await queueOp({ type: "triage", patientUhid: uhid || undefined, payload: { complaint, capturedBy: user?.name } });
    toast.success("Triage captured offline — will sync automatically");
  }, [user?.name]);

  /* ---------- loading ---------- */
  if (sessionLoading && !user) {
    return (
      <div className="nx-root" data-theme="dark" data-accent={accent}>
        <Splash />
      </div>
    );
  }

  /* ---------- login ---------- */
  if (!user) {
    return (
      <div className="nx-root" data-theme={resolvedTheme} data-accent={accent} data-motion={motion}>
        <NxLogin
          onSignedIn={(u) => {
            setSignedOut(false);
            void refreshSession();
            const landing = LANDING_BY_ROLE[u.role] ?? "command-center";
            queueMicrotask(() => useOs.getState().openApp(landing));
          }}
        />
      </div>
    );
  }

  /* ---------- allowed modules (RBAC) ---------- */
  const modules = session?.modules || [];
  const allowed = new Set<string>(
    user.role === "admin" ? APPS.filter((a) => !a.system).map((a) => a.key) : modules
  );

  return (
    <div
      className="nx-root"
      data-theme={resolvedTheme}
      data-accent={accent}
      data-density={density}
      data-motion={motion}
      data-night={night ? "true" : "false"}
    >
      <ConsoleShell
        user={{ name: user.name, role: user.role, department: user.department, id: user.id, hospitalId: user.hospitalId }}
        allowed={allowed}
        demoMode={demoMode}
        banner={banner}
        taskCount={taskCritical}
        incidentCount={incidentCritical}
        offline={!online}
        onSignOut={signOut}
        onCaptureTriage={captureTriage}
      />
      {locked && (
        <NxLock user={{ name: user.name, role: user.role, department: user.department }} onSignOut={signOut} />
      )}
    </div>
  );
}
