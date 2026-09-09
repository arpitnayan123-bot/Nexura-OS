"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Maximize2, Minus, Pin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { appFor, type AppCtx } from "./registry";
import { NxTitlebarBack } from "./back-ui";
import { BAR_H, DOCK_SAFE, WS_COUNT, useOs, type WinState } from "./store";
import { CtxMenu, type CtxItem } from "./ctx";

/* ============================================================
   HOSPITAL OS — window manager
   Drag, resize (8 handles), z-focus stack, edge snap, min/max,
   close animation, mobile sheets, workspaces and the F9
   overview that scales every window into a grid.
   Geometry is relative to the desktop stage (the area right
   below the system bar).
   ============================================================ */

const MIN_W = 380;
const MIN_H = 280;

type SnapSide = "left" | "right";
interface GhostRect { x: number; y: number; w: number; h: number }

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

export function NxWindowManager({ appCtx }: { appCtx: AppCtx }) {
  const wins = useOs((s) => s.wins);
  const closing = useOs((s) => s.closing);
  const focused = useOs((s) => s.focused);
  const workspace = useOs((s) => s.workspace);
  const overviewOpen = useOs((s) => s.overviewOpen);
  const [ghost, setGhost] = useState<GhostRect | null>(null);
  const isMobile = useIsMobile();

  const ov = overviewOpen && !isMobile;

  /* windows visible right now — current workspace, or all during overview */
  const visible = useMemo(() => {
    if (ov) return [...wins].sort((a, b) => a.ws - b.ws || b.z - a.z);
    return wins.filter((w) => w.ws === workspace);
  }, [wins, ov, workspace]);

  /* overview grid transforms, keyed by window */
  const transforms = useMemo(() => {
    if (!ov || visible.length === 0) return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const padX = 52;
    const padTop = 64;
    const padBottom = DOCK_SAFE + 8;
    const gap = 18;
    const n = visible.length;
    const cols = Math.min(n, Math.ceil(Math.sqrt(n)));
    const rows = Math.ceil(n / cols);
    const slotW = (vw - padX * 2 - gap * (cols - 1)) / cols;
    const slotH = (vh - padTop - padBottom - gap * (rows - 1)) / rows;
    const map: Record<string, string> = {};
    visible.forEach((w, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const scale = Math.min(slotW / w.w, slotH / w.h, 0.82);
      const dx = padX + col * (slotW + gap) + (slotW - w.w * scale) / 2 - w.x;
      const dy = padTop + row * (slotH + gap) + (slotH - w.h * scale) / 2 - w.y;
      map[w.key] = `translate(${Math.round(dx)}px, ${Math.round(dy)}px) scale(${scale.toFixed(3)})`;
    });
    return map;
  }, [ov, visible]);

  return (
    <>
      {ghost && (
        <div
          className="nx-snap-ghost"
          style={{ left: ghost.x, top: ghost.y, width: ghost.w, height: ghost.h }}
          aria-hidden
        />
      )}
      {ov && (
        <>
          <div className="nx-ov-scrim" onClick={() => useOs.getState().setOverview(false)} aria-hidden />
          <div className="nx-ov-hint" role="status">
            Overview — all {visible.length} window{visible.length === 1 ? "" : "s"} · click one to focus · Esc to exit
          </div>
        </>
      )}
      <div className={ov ? "nx-ov-active" : undefined}>
        {visible.map((w) => (
          <NxWindow
            key={w.key}
            win={w}
            focusedWin={focused === w.key && !closing.includes(w.key)}
            exiting={closing.includes(w.key)}
            isMobile={isMobile}
            ghost={setGhost}
            appCtx={appCtx}
            ovTransform={ov ? transforms?.[w.key] : undefined}
          />
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function NxWindow({ win, focusedWin, exiting, isMobile, ghost, appCtx, ovTransform }: {
  win: WinState;
  focusedWin: boolean;
  exiting: boolean;
  isMobile: boolean;
  ghost: (g: GhostRect | null) => void;
  appCtx: AppCtx;
  ovTransform?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [titleMenu, setTitleMenu] = useState<{ x: number; y: number } | null>(null);
  const finishClose = useOs((s) => s.finishClose);
  const focusApp = useOs((s) => s.focusApp);
  const def = appFor(win.key);

  /* close animation + fallback */
  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(() => finishClose(win.key), 360);
    return () => clearTimeout(t);
  }, [exiting, finishClose, win.key]);

  const maxed = win.max || isMobile;
  const hidden = win.min || (isMobile && !focusedWin);

  /* ---------------- drag ---------------- */
  const onTitlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || maxed) return;
      focusApp(win.key);
      const el = ref.current;
      if (!el) return;
      const { vw, vh, availH } = stage();
      const startX = e.clientX;
      const startY = e.clientY;
      const ox = win.x;
      const oy = win.y;
      let nx = ox;
      let ny = oy;
      let snap: SnapSide | null = null;
      setDragging(true);
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic events have no active pointer */ }

      const move = (ev: PointerEvent) => {
        nx = Math.min(Math.max(ox + (ev.clientX - startX), -win.w + 120), vw - 120);
        ny = Math.min(Math.max(oy + (ev.clientY - startY), 0), availH - 44);
        el.style.left = `${nx}px`;
        el.style.top = `${ny}px`;
        const side: SnapSide | null = ev.clientX <= 8 ? "left" : ev.clientX >= vw - 8 ? "right" : null;
        if (side !== snap) {
          snap = side;
          ghost(side ? { x: side === "left" ? 0 : Math.round(vw / 2), y: 0, w: Math.round(vw / 2), h: availH } : null);
        }
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        ghost(null);
        setDragging(false);
        if (snap) useOs.getState().snapApp(win.key, snap);
        else useOs.getState().setGeom(win.key, { x: nx, y: ny }, true);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up, { once: true });
    },
    [win.key, win.x, win.y, win.w, maxed, focusApp, ghost]
  );

  /* ---------------- resize ---------------- */
  const onResizePointerDown = useCallback(
    (dir: string) => (e: React.PointerEvent) => {
      if (e.button !== 0 || maxed) return;
      e.stopPropagation();
      focusApp(win.key);
      const el = ref.current;
      if (!el) return;
      const { vw, availH } = stage();
      const sx = e.clientX;
      const sy = e.clientY;
      const o = { x: win.x, y: win.y, w: win.w, h: win.h };
      let g = { ...o };
      setResizing(true);
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic events have no active pointer */ }

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - sx;
        const dy = ev.clientY - sy;
        const n = { ...o };
        if (dir.includes("e")) n.w = Math.min(Math.max(o.w + dx, MIN_W), vw - o.x);
        if (dir.includes("s")) n.h = Math.min(Math.max(o.h + dy, MIN_H), availH - o.y);
        if (dir.includes("w")) {
          const w2 = Math.min(Math.max(o.w - dx, MIN_W), o.x + o.w);
          n.x = o.x + o.w - w2;
          n.w = w2;
        }
        if (dir.includes("n")) {
          const h2 = Math.min(Math.max(o.h - dy, MIN_H), o.y + o.h);
          n.y = o.y + o.h - h2;
          n.h = h2;
        }
        g = n;
        el.style.left = `${n.x}px`;
        el.style.top = `${n.y}px`;
        el.style.width = `${n.w}px`;
        el.style.height = `${n.h}px`;
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        setResizing(false);
        useOs.getState().setGeom(win.key, g, true);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up, { once: true });
    },
    [win.key, win.x, win.y, win.w, win.h, maxed, focusApp]
  );

  /* ---------------- title-bar context menu ---------------- */
  const titleMenuItems: CtxItem[] = useMemo(() => [
    { label: "Minimize", icon: Minus, kbd: "⌘M", onSelect: () => useOs.getState().minimizeApp(win.key) },
    { label: maxed ? "Restore" : "Maximize", icon: Maximize2, onSelect: () => !isMobile && useOs.getState().toggleMax(win.key) },
    { label: "Snap left", icon: ArrowLeftRight, onSelect: () => useOs.getState().snapApp(win.key, "left") },
    { label: "Snap right", icon: ArrowLeftRight, onSelect: () => useOs.getState().snapApp(win.key, "right") },
    { kind: "sep" },
    { kind: "label", label: "Move to workspace" },
    ...Array.from({ length: WS_COUNT }, (_, i) => i + 1).map((ws) => ({
      label: `Workspace ${ws}`,
      checked: win.ws === ws,
      onSelect: () => useOs.getState().moveWinToWorkspace(win.key, ws),
    })),
    { kind: "sep" },
    { label: "Close window", icon: X, kbd: "⌘W", danger: true, onSelect: () => useOs.getState().closeApp(win.key) },
  ], [win.key, win.ws, maxed, isMobile]);

  if (!def) return null;
  const Icon = def.icon;

  const style: React.CSSProperties = maxed
    ? { left: 0, top: 0, width: "100%", height: "100%", zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };

  if (ovTransform) {
    style.transform = ovTransform;
    style.transformOrigin = "0 0";
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={def.label}
      className={cn(
        "nx-win",
        focusedWin && !maxed && "nx-win-focused",
        !focusedWin && !maxed && "nx-win-unfocused",
        maxed && "nx-win-max",
        (dragging || resizing) && "nx-win-dragging",
        exiting && "nx-win-anim-out"
      )}
      style={{ ...style, display: hidden ? "none" : undefined }}
      onPointerDown={() => {
        if (ovTransform) { useOs.getState().openApp(win.key); return; }
        focusApp(win.key);
      }}
    >
      {/* title bar */}
      <div
        className="nx-win-title"
        onPointerDown={onTitlePointerDown}
        onDoubleClick={() => !isMobile && useOs.getState().toggleMax(win.key)}
        onContextMenu={(e) => {
          if (isMobile || ovTransform) return;
          e.preventDefault();
          setTitleMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <div className="nx-tc-group flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
          <NxTitlebarBack winKey={win.key} />
          <button aria-label="Close window" className="nx-tc nx-tc-close" onClick={() => useOs.getState().closeApp(win.key)}>
            <X className="h-2 w-2 text-black" />
          </button>
          <button aria-label="Minimize window" className="nx-tc nx-tc-min" onClick={() => useOs.getState().minimizeApp(win.key)}>
            <Minus className="h-2 w-2 text-black" />
          </button>
          <button
            aria-label={maxed ? "Restore window" : "Maximize window"}
            className="nx-tc nx-tc-max"
            onClick={() => !isMobile && useOs.getState().toggleMax(win.key)}
          >
            <Maximize2 className="h-2 w-2 text-black" />
          </button>
        </div>
        <Icon className={cn("ml-1 h-3.5 w-3.5 shrink-0", focusedWin ? "text-accent" : "text-ink-3")} />
        <span className={cn("truncate text-[12.5px] font-medium", focusedWin ? "text-ink" : "text-ink-3")}>{def.label}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5 pr-1 text-[10px] text-ink-4">
          {!isMobile && (
            <span className="nx-ov-ws-chip" title={`On workspace ${win.ws}`}>
              <Pin className="h-2.5 w-2.5" /> WS {win.ws}
            </span>
          )}
          {focusedWin && <kbd className="rounded border border-line-2 bg-inset px-1 py-0.5">⌘W</kbd>}
        </span>
      </div>

      {/* content */}
      <div className="nx-win-body nx-scroll">
        <div className="mx-auto max-w-[1400px] p-4 lg:p-5">{def.render(appCtx)}</div>
      </div>

      {/* resize handles */}
      {!maxed && !exiting && (
        <>
          <div className="nx-rz nx-rz-n" onPointerDown={onResizePointerDown("n")} />
          <div className="nx-rz nx-rz-s" onPointerDown={onResizePointerDown("s")} />
          <div className="nx-rz nx-rz-w" onPointerDown={onResizePointerDown("w")} />
          <div className="nx-rz nx-rz-e" onPointerDown={onResizePointerDown("e")} />
          <div className="nx-rz nx-rz-nw" onPointerDown={onResizePointerDown("nw")} />
          <div className="nx-rz nx-rz-ne" onPointerDown={onResizePointerDown("ne")} />
          <div className="nx-rz nx-rz-sw" onPointerDown={onResizePointerDown("sw")} />
          <div className="nx-rz nx-rz-se" onPointerDown={onResizePointerDown("se")} />
        </>
      )}

      {titleMenu && (
        <CtxMenu x={titleMenu.x} y={titleMenu.y} items={titleMenuItems} onClose={() => setTitleMenu(null)} />
      )}
    </div>
  );
}

function stage() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return { vw, vh, availH: vh - BAR_H - DOCK_SAFE };
}
