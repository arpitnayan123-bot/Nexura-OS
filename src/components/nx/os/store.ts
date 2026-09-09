"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useBack } from "./back";

/* ============================================================
   HOSPITAL OS — kernel store
   Preferences (persisted) + window manager state + notices +
   workspaces, overview, app switcher, lock & boot phases.
   ============================================================ */

export type ThemeMode = "auto" | "light" | "dark";
export type Accent = "amber" | "jade" | "coral" | "cyan" | "violet";
export type Density = "comfortable" | "compact";
export type MotionMode = "full" | "reduced";
export type Wallpaper = "aurora" | "dawn" | "meadow" | "mono";

export const BAR_H = 46;
export const DOCK_SAFE = 84;
export const WS_COUNT = 3;

export interface WinGeom { x: number; y: number; w: number; h: number }

export interface WinState extends WinGeom {
  key: string;
  z: number;
  min: boolean;
  max: boolean;
  ws: number; // workspace the window lives on (1..WS_COUNT)
  rx: number; ry: number; rw: number; rh: number; // restore geometry
}

export type NoticeTone = "crit" | "warn" | "info" | "good";
export interface NxNotice {
  id: string;
  title: string;
  body?: string;
  tone: NoticeTone;
  moduleKey?: string;
  ts: number;
  read: boolean;
}

interface OsState {
  /* preferences */
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  accent: Accent;
  density: Density;
  motion: MotionMode;
  night: boolean;
  focus: boolean;
  dockPins: string[];
  recents: string[];
  wallpaper: Wallpaper;
  workspace: number;
  /* windows */
  wins: WinState[];
  zTop: number;
  focused: string | null;
  closing: string[];
  /* overlays */
  launcherOpen: boolean;
  paletteOpen: boolean;
  notifOpen: boolean;
  quickOpen: boolean;
  overviewOpen: boolean;
  switcherOpen: boolean;
  switcherIdx: number;
  /* session */
  locked: boolean;
  /* notifications */
  notices: NxNotice[];

  /* actions */
  setTheme: (t: ThemeMode) => void;
  setResolved: (t: "light" | "dark") => void;
  setAccent: (a: Accent) => void;
  setDensity: (d: Density) => void;
  setMotion: (m: MotionMode) => void;
  setNight: (v: boolean) => void;
  setFocus: (v: boolean) => void;
  setWallpaper: (w: Wallpaper) => void;
  togglePin: (key: string) => void;

  openApp: (key: string, opts?: { fresh?: boolean }) => void;
  closeApp: (key: string) => void;
  finishClose: (key: string) => void;
  focusApp: (key: string) => void;
  minimizeApp: (key: string) => void;
  toggleMax: (key: string) => void;
  setGeom: (key: string, g: Partial<WinGeom>, asRestore?: boolean) => void;
  snapApp: (key: string, side: "left" | "right") => void;
  moveWinToWorkspace: (key: string, ws: number) => void;

  setWorkspace: (ws: number) => void;
  setOverview: (v: boolean) => void;
  openSwitcher: () => void;
  cycleSwitcher: (dir: 1 | -1) => void;
  confirmSwitcher: () => void;
  cancelSwitcher: () => void;
  lock: () => void;
  unlock: () => void;

  setLauncher: (v: boolean) => void;
  setPalette: (v: boolean) => void;
  setNotif: (v: boolean) => void;
  setQuick: (v: boolean) => void;
  closeOverlays: () => void;

  pushNotice: (n: Omit<NxNotice, "id" | "ts" | "read">) => void;
  readNotice: (id: string) => void;
  dismissNotice: (id: string) => void;
  clearNotices: () => void;
  markAllRead: () => void;
}

const DEFAULT_PINS = ["command-center", "tasks", "patients", "beds", "messages"];

function viewport() {
  if (typeof window === "undefined") return { vw: 1440, vh: 900 };
  return { vw: window.innerWidth, vh: window.innerHeight };
}

export function defaultGeom(vw: number, vh: number): WinGeom {
  const w = Math.min(1180, Math.round(vw * 0.86));
  const availH = Math.max(240, vh - BAR_H - DOCK_SAFE);
  const h = Math.min(780, Math.round(availH * 0.92));
  const x = Math.max(12, Math.round((vw - w) / 2));
  const y = Math.max(8, Math.round((availH - h) * 0.35));
  return { x, y, w, h };
}

export const useOs = create<OsState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      resolvedTheme: "dark",
      accent: "amber",
      density: "comfortable",
      motion: "full",
      night: false,
      focus: false,
      dockPins: DEFAULT_PINS,
      recents: [],
      wallpaper: "aurora",
      workspace: 1,

      wins: [],
      zTop: 10,
      focused: null,
      closing: [],

      launcherOpen: false,
      paletteOpen: false,
      notifOpen: false,
      quickOpen: false,
      overviewOpen: false,
      switcherOpen: false,
      switcherIdx: 0,

      locked: false,

      notices: [],

      setTheme: (t) => set({ theme: t }),
      setResolved: (t) => set({ resolvedTheme: t }),
      setAccent: (a) => set({ accent: a }),
      setDensity: (d) => set({ density: d }),
      setMotion: (m) => set({ motion: m }),
      setNight: (v) => set({ night: v }),
      setFocus: (v) => set({ focus: v }),
      setWallpaper: (w) => set({ wallpaper: w }),

      togglePin: (key) =>
        set((s) => ({
          dockPins: s.dockPins.includes(key)
            ? s.dockPins.filter((k) => k !== key)
            : [...s.dockPins, key].slice(0, 10),
        })),

      openApp: (key, opts) => {
        const s = get();
        if (s.locked) return;
        const { vw, vh } = viewport();
        const existing = s.wins.find((w) => w.key === key);
        const z = s.zTop + 1;

        if (existing && !opts?.fresh) {
          const wasMin = existing.min;
          set({
            wins: s.wins.map((w) =>
              w.key === key ? { ...w, min: false, z } : w
            ),
            zTop: z,
            focused: key,
            /* focusing a window takes you to its workspace */
            workspace: existing.ws,
            overviewOpen: false,
            switcherOpen: false,
            launcherOpen: false,
            paletteOpen: false,
            notifOpen: false,
            quickOpen: false,
            recents: [key, ...s.recents.filter((k) => k !== key)].slice(0, 8),
          });
          /* a restored window joins the back stack so device back can
             dismiss it again */
          if (wasMin) {
            useBack.getState().push({
              id: `win:${key}`,
              scope: "os",
              kind: "window",
              label: key,
              refKey: key,
              prevKey: s.focused && s.focused !== key ? s.focused : s.recents.find((k) => k !== key) ?? null,
              close: () => get().closeApp(key),
            });
          }
          return;
        }

        const base = defaultGeom(vw, vh);
        const cascade = (s.wins.length % 6) * 26;
        const win: WinState = {
          key,
          x: Math.min(base.x + cascade, Math.max(12, vw - 320)),
          y: Math.min(base.y + cascade, Math.max(8, vh - DOCK_SAFE - 200)),
          w: base.w,
          h: base.h,
          z,
          min: false,
          max: vw < 768,
          ws: s.workspace,
          rx: base.x, ry: base.y, rw: base.w, rh: base.h,
        };
        set({
          wins: existing
            ? s.wins.map((w) => (w.key === key ? { ...win, z } : w))
            : [...s.wins, win],
          zTop: z,
          focused: key,
          closing: s.closing.filter((k) => k !== key),
          overviewOpen: false,
          switcherOpen: false,
          launcherOpen: false,
          paletteOpen: false,
          notifOpen: false,
          quickOpen: false,
          recents: [key, ...s.recents.filter((k) => k !== key)].slice(0, 8),
        });

        /* every freshly opened window is one step back */
        useBack.getState().push({
          id: `win:${key}`,
          scope: "os",
          kind: "window",
          label: key,
          refKey: key,
          prevKey: s.focused && s.focused !== key ? s.focused : s.recents.find((k) => k !== key) ?? null,
          close: () => get().closeApp(key),
        });
      },

      closeApp: (key) => {
        useBack.getState().remove(`win:${key}`);
        set((s) => ({
          closing: [...s.closing, key],
          focused: s.focused === key ? null : s.focused,
        }));
      },

      finishClose: (key) =>
        set((s) => ({
          wins: s.wins.filter((w) => w.key !== key),
          closing: s.closing.filter((k) => k !== key),
        })),

      focusApp: (key) =>
        set((s) => {
          if (s.focused === key && s.wins.find((w) => w.key === key)?.z === s.zTop) return s;
          const z = s.zTop + 1;
          return {
            wins: s.wins.map((w) => (w.key === key ? { ...w, z, min: false } : w)),
            zTop: z,
            focused: key,
          };
        }),

      minimizeApp: (key) => {
        useBack.getState().remove(`win:${key}`);
        set((s) => ({
          wins: s.wins.map((w) => (w.key === key ? { ...w, min: true } : w)),
          focused: s.focused === key ? null : s.focused,
        }));
      },

      toggleMax: (key) =>
        set((s) => {
          const { vw, vh } = viewport();
          return {
            wins: s.wins.map((w) => {
              if (w.key !== key) return w;
              if (w.max) {
                return { ...w, max: false, x: w.rx, y: w.ry, w: w.rw, h: w.rh };
              }
              return {
                ...w, max: true,
                rx: w.x, ry: w.y, rw: w.w, rh: w.h,
                x: 0, y: 0, w: vw, h: vh - BAR_H,
              };
            }),
          };
        }),

      setGeom: (key, g, asRestore) =>
        set((s) => ({
          wins: s.wins.map((w) =>
            w.key === key
              ? {
                  ...w, ...g,
                  ...(asRestore ? { rx: g.x ?? w.rx, ry: g.y ?? w.ry, rw: g.w ?? w.rw, rh: g.h ?? w.rh } : {}),
                }
              : w
          ),
        })),

      snapApp: (key, side) => {
        const { vw, vh } = viewport();
        const h = vh - BAR_H;
        const g = side === "left"
          ? { x: 0, y: 0, w: Math.round(vw / 2), h }
          : { x: Math.round(vw / 2), y: 0, w: vw - Math.round(vw / 2), h };
        set((s) => ({
          wins: s.wins.map((w) =>
            w.key === key
              ? { ...w, max: false, ...g, rx: w.x, ry: w.y, rw: w.w, rh: w.h }
              : w
          ),
        }));
      },

      /* ---------- workspaces ---------- */
      moveWinToWorkspace: (key, ws) =>
        set((s) => ({
          wins: s.wins.map((w) => (w.key === key ? { ...w, ws: Math.min(Math.max(1, ws), WS_COUNT) } : w)),
        })),

      setWorkspace: (ws) =>
        set((s) => {
          const next = Math.min(Math.max(1, ws), WS_COUNT);
          if (next === s.workspace && !s.overviewOpen) return s;
          const top = s.wins.filter((w) => w.ws === next && !w.min).sort((a, b) => b.z - a.z)[0];
          return {
            workspace: next,
            overviewOpen: false,
            switcherOpen: false,
            launcherOpen: false,
            paletteOpen: false,
            quickOpen: false,
            notifOpen: false,
            focused: top ? top.key : null,
          };
        }),

      /* ---------- overview & app switcher ---------- */
      setOverview: (v) =>
        set({ overviewOpen: v, launcherOpen: false, paletteOpen: false, quickOpen: false, notifOpen: false, switcherOpen: false }),

      openSwitcher: () =>
        set((s) => {
          if (s.locked || s.wins.length < 2) return s;
          const mru = [...s.wins].sort((a, b) => b.z - a.z);
          const target = mru[1]?.key ?? mru[0].key;
          return { switcherOpen: true, switcherIdx: mru.findIndex((w) => w.key === target), launcherOpen: false, paletteOpen: false, quickOpen: false, notifOpen: false, overviewOpen: false };
        }),

      cycleSwitcher: (dir) =>
        set((s) => {
          if (!s.switcherOpen || s.wins.length === 0) return s;
          const n = s.wins.length;
          const idx = (s.switcherIdx + dir + n) % n;
          return { switcherIdx: idx };
        }),

      confirmSwitcher: () =>
        set((s) => {
          if (!s.switcherOpen) return s;
          const mru = [...s.wins].sort((a, b) => b.z - a.z);
          const win = mru[s.switcherIdx];
          if (!win) return { switcherOpen: false };
          const z = s.zTop + 1;
          return {
            switcherOpen: false,
            workspace: win.ws,
            wins: s.wins.map((w) => (w.key === win.key ? { ...w, z, min: false } : w)),
            zTop: z,
            focused: win.key,
          };
        }),

      cancelSwitcher: () => set({ switcherOpen: false }),

      /* ---------- lock ---------- */
      lock: () =>
        set({ locked: true, launcherOpen: false, paletteOpen: false, quickOpen: false, notifOpen: false, overviewOpen: false, switcherOpen: false }),
      unlock: () => set({ locked: false }),

      setLauncher: (v) => set({ launcherOpen: v, paletteOpen: false, quickOpen: false, notifOpen: false, switcherOpen: false }),
      setPalette: (v) => set({ paletteOpen: v, launcherOpen: false, quickOpen: false, notifOpen: false, switcherOpen: false }),
      setNotif: (v) => set({ notifOpen: v, quickOpen: v ? false : get().quickOpen }),
      setQuick: (v) => set({ quickOpen: v, notifOpen: v ? false : get().notifOpen }),
      closeOverlays: () => set({ launcherOpen: false, paletteOpen: false, quickOpen: false, notifOpen: false, overviewOpen: false, switcherOpen: false }),

      pushNotice: (n) =>
        set((s) => {
          const now = Date.now();
          if (s.notices.some((m) => m.title === n.title && (!n.body || m.body === n.body) && now - m.ts < 75_000)) return s;
          const notice: NxNotice = { ...n, id: `n-${now}-${Math.random().toString(36).slice(2, 7)}`, ts: now, read: false };
          return { notices: [notice, ...s.notices].slice(0, 40) };
        }),

      readNotice: (id) =>
        set((s) => ({ notices: s.notices.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      dismissNotice: (id) =>
        set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
      clearNotices: () => set({ notices: [] }),
      markAllRead: () =>
        set((s) => ({ notices: s.notices.map((n) => ({ ...n, read: true })) })),
    }),
    {
      name: "nexura-os-prefs-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        theme: s.theme,
        accent: s.accent,
        density: s.density,
        motion: s.motion,
        night: s.night,
        focus: s.focus,
        dockPins: s.dockPins,
        recents: s.recents,
        wallpaper: s.wallpaper,
        workspace: s.workspace,
      }),
    }
  )
);
