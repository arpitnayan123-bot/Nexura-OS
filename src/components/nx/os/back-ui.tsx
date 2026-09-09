"use client";

import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { appFor } from "./registry";
import { useOs } from "./store";
import { useBack, type BackLayer } from "./back";
import { useIsMobile } from "./wm";

/* ============================================================
   HOSPITAL OS — back navigation UI
   A Pinterest-style frosted-glass control set:
   • NxBackControls — system-bar pill (desktop) + floating
     glass arrow (mobile), always one tap from the previous
     screen, with a live count of open layers.
   • NxTitlebarBack — the per-window arrow that returns to the
     previously focused window.
   ============================================================ */

interface OverlayDef {
  id: string;
  flag: "launcherOpen" | "paletteOpen" | "quickOpen" | "overviewOpen";
  label: string;
}

const OVERLAYS: OverlayDef[] = [
  { id: "ov:launcher", flag: "launcherOpen", label: "Launchpad" },
  { id: "ov:palette", flag: "paletteOpen", label: "Command palette" },
  { id: "ov:quick", flag: "quickOpen", label: "Quick settings" },
  { id: "ov:overview", flag: "overviewOpen", label: "Overview" },
];

/* keep shell overlays on the back stack (notifications + switcher
   are handled by their own Escape/pointer paths and stay ephemeral) */
function useOverlayBackLayers(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const sync = () => {
      const os = useOs.getState();
      const back = useBack.getState();
      for (const ov of OVERLAYS) {
        const open = os[ov.flag];
        const present = back.stack.some((l) => l.id === ov.id);
        if (open && !present) {
          back.push({
            id: ov.id,
            scope: "os",
            kind: "overlay",
            label: ov.label,
            close: () => useOs.getState().closeOverlays(),
          });
        } else if (!open && present) {
          back.remove(ov.id);
        }
      }
    };
    sync();
    return useOs.subscribe(sync);
  }, [enabled]);
}

/* resolve the top layer into human language for the controls */
function describeTop(top: BackLayer | undefined): string {
  if (!top) return "Back";
  if (top.kind === "view") return `Back to ${top.label}`;
  if (top.kind === "overlay") return `Close ${top.label}`;
  /* window layer — prefer the window that was focused before it, but only
     if that window is still open (recents may outlive the session) */
  if (top.kind === "window") {
    const wins = useOs.getState().wins;
    if (top.prevKey && wins.some((w) => w.key === top.prevKey)) {
      const prev = appFor(top.prevKey);
      if (prev) return `Back to ${prev.label}`;
    }
    const self = top.refKey ? appFor(top.refKey) : undefined;
    return self ? `Close ${self.label}` : "Back";
  }
  return "Back";
}

/* ------------------------------------------------------------------ */
/* Shell sync — keeps overlays registered while signed in              */
/* ------------------------------------------------------------------ */

export function NxBackSync({ enabled }: { enabled: boolean }) {
  useOverlayBackLayers(enabled);
  return null;
}

/* ------------------------------------------------------------------ */
/* System-bar pill (desktop)                                           */
/* ------------------------------------------------------------------ */

export function NxBackPill() {
  const depth = useBack((s) => s.stack.length);
  const top = useBack((s) => s.stack[s.stack.length - 1]);
  const goBack = useBack((s) => s.goBack);
  const isMobile = useIsMobile();

  if (depth === 0 || isMobile) return null;
  const text = describeTop(top);

  return (
    <button
      type="button"
      onClick={() => goBack()}
      className="nx-back-pill"
      title={text}
      aria-label={text}
    >
      <span className="nx-back-disc" aria-hidden>
        <ArrowLeft className="h-3 w-3" />
      </span>
      <span className="max-w-44 truncate">{text}</span>
      {depth > 1 && <span className="nx-back-count">{depth}</span>}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Floating glass arrow (mobile)                                       */
/* ------------------------------------------------------------------ */

export function NxBackFab() {
  const depth = useBack((s) => s.stack.length);
  const top = useBack((s) => s.stack[s.stack.length - 1]);
  const goBack = useBack((s) => s.goBack);

  if (depth === 0) return null;
  const text = describeTop(top);

  return (
    <button
      type="button"
      onClick={() => goBack()}
      className="nx-back-fab"
      aria-label={text}
      title={text}
    >
      <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
      {depth > 1 && <span className="nx-back-fab-badge">{depth}</span>}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Per-window titlebar arrow — back to the previous window             */
/* ------------------------------------------------------------------ */

export function NxTitlebarBack({ winKey }: { winKey: string }) {
  const scopeDepth = useBack((s) => s.stack.filter((l) => l.scope === winKey).length);
  const windowDepth = useBack((s) => s.stack.filter((l) => l.kind === "window").length);
  const top = useBack((s) => s.stack[s.stack.length - 1]);
  const minimizeApp = useOs((s) => s.minimizeApp);
  const isFocused = useOs((s) => s.focused === winKey);

  const hasScopeViews = scopeDepth > 0;
  const overlayOnTop = top?.kind === "overlay";
  const hasOtherWindows = windowDepth > 1;
  const visible = hasScopeViews || (isFocused && (hasOtherWindows || overlayOnTop));
  if (!visible) return null;

  const onClick = () => {
    const s = useBack.getState();
    /* 1 — close a view inside this window first */
    const scopeTop = [...s.stack].reverse().find((l) => l.scope === winKey);
    if (scopeTop) {
      s.remove(scopeTop.id);
      try { scopeTop.close(); } catch { /* already closed */ }
      return;
    }
    /* 2 — let a shell overlay step aside */
    if (overlayOnTop && top) {
      s.remove(top.id);
      try { top.close(); } catch { /* already closed */ }
      return;
    }
    /* 3 — dismiss this window; the one beneath regains focus */
    const own = s.stack.find((l) => l.id === `win:${winKey}`);
    if (own) {
      s.remove(own.id);
      try { own.close(); } catch { /* already closed */ }
      return;
    }
    minimizeApp(winKey);
    const prev = useOs
      .getState()
      .wins.filter((w) => w.key !== winKey && !w.min)
      .sort((a, b) => b.z - a.z)[0];
    if (prev) useOs.getState().focusApp(prev.key);
  };

  const label = hasScopeViews && top ? describeTop(top) : "Back to previous window";

  return (
    <button
      type="button"
      onClick={onClick}
      className="nx-back-tb"
      aria-label={label}
      title={label}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
    </button>
  );
}
