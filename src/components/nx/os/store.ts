"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useBack } from "./back";

/* ============================================================
   HOSPITAL OS — kernel store (console shell)

   Focus-mode redesign: the fake-desktop machinery (floating
   windows, workspaces, dock, launcher, app switcher, wallpapers-
   as-desktop) is gone. The kernel now carries only what a calm
   hospital console needs: appearance prefs, the active module,
   shell overlays, lock and notices.
   ============================================================ */

export type ThemeMode = "auto" | "light" | "dark";
export type Accent = "amber" | "jade" | "coral" | "cyan" | "violet";
export type Density = "comfortable" | "compact";
export type MotionMode = "full" | "reduced";
export type Wallpaper = "aurora" | "dawn" | "meadow" | "mono";

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
  /* preferences (persisted) */
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  accent: Accent;
  density: Density;
  motion: MotionMode;
  night: boolean;
  focus: boolean;
  wallpaper: Wallpaper;
  /* active module (the one rendered in the content pane) */
  active: string | null;
  recents: string[];
  /* overlays */
  paletteOpen: boolean;
  notifOpen: boolean;
  quickOpen: boolean;
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

  openApp: (key: string) => void;

  setPalette: (v: boolean) => void;
  setNotif: (v: boolean) => void;
  setQuick: (v: boolean) => void;
  closeOverlays: () => void;

  lock: () => void;
  unlock: () => void;

  pushNotice: (n: Omit<NxNotice, "id" | "ts" | "read">) => void;
  readNotice: (id: string) => void;
  dismissNotice: (id: string) => void;
  clearNotices: () => void;
  markAllRead: () => void;
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
      wallpaper: "aurora",

      active: null,
      recents: [],

      paletteOpen: false,
      notifOpen: false,
      quickOpen: false,

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

      /* navigating to a module: one active pane, overlays dismissed,
         recents updated, and the back stack learns the step so device
         back / Escape returns to the previous module */
      openApp: (key) => {
        const s = get();
        if (s.locked) return;
        if (s.active === key && !s.paletteOpen && !s.notifOpen && !s.quickOpen) return;
        set({
          active: key,
          recents: [key, ...s.recents.filter((k) => k !== key)].slice(0, 8),
          paletteOpen: false,
          notifOpen: false,
          quickOpen: false,
        });
        if (s.active && s.active !== key) {
          useBack.getState().remove(`nav:${s.active}`);
        }
        useBack.getState().remove(`nav:${key}`);
        useBack.getState().push({
          id: `nav:${key}`,
          scope: "os",
          kind: "window",
          label: key,
          refKey: key,
          prevKey: s.active,
          close: () => {
            const prev = get().recents.find((k) => k !== key) ?? "command-center";
            get().openApp(prev);
          },
        });
      },

      setPalette: (v) =>
        set({ paletteOpen: v, quickOpen: false, notifOpen: v ? false : get().notifOpen }),
      setNotif: (v) =>
        set({
          notifOpen: v,
          quickOpen: v ? false : get().quickOpen,
          paletteOpen: v ? false : get().paletteOpen,
        }),
      setQuick: (v) =>
        set({
          quickOpen: v,
          notifOpen: v ? false : get().notifOpen,
          paletteOpen: v ? false : get().paletteOpen,
        }),
      closeOverlays: () => set({ paletteOpen: false, quickOpen: false, notifOpen: false }),

      lock: () => set({ locked: true, paletteOpen: false, quickOpen: false, notifOpen: false }),
      unlock: () => set({ locked: false }),

      pushNotice: (n) =>
        set((s) => {
          const now = Date.now();
          if (
            s.notices.some(
              (m) => m.title === n.title && (!n.body || m.body === n.body) && now - m.ts < 75_000,
            )
          )
            return s;
          const notice: NxNotice = {
            ...n,
            id: `n-${now}-${Math.random().toString(36).slice(2, 7)}`,
            ts: now,
            read: false,
          };
          return { notices: [notice, ...s.notices].slice(0, 40) };
        }),

      readNotice: (id) =>
        set((s) => ({ notices: s.notices.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      dismissNotice: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
      clearNotices: () => set({ notices: [] }),
      markAllRead: () => set((s) => ({ notices: s.notices.map((n) => ({ ...n, read: true })) })),
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
        wallpaper: s.wallpaper,
        recents: s.recents,
      }),
    },
  ),
);
