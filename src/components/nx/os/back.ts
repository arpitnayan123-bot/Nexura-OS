"use client";

import { useEffect, useRef } from "react";
import { create } from "zustand";
import { toast } from "sonner";

/* ============================================================
   HOSPITAL OS — universal back navigation
   A single stack of "layers" describing everything the user
   has drilled into, from overlays (launcher, notifications)
   to app windows to views inside an app (patient record,
   booking dialog). One `goBack()` pops the top layer, and a
   History bridge mirrors the stack onto the browser history
   so the Android/browser back button walks layers *inside*
   Hospital OS instead of leaving to the homepage.
   ============================================================ */

export type BackKind = "overlay" | "window" | "view";

export interface BackLayer {
  id: string;
  /** window key the layer belongs to, or "os" for shell-level layers */
  scope: string;
  kind: BackKind;
  /** destination shown in the back pill, e.g. "Patient Records" */
  label: string;
  /** window key of the surface that was focused before this window opened */
  prevKey?: string | null;
  /** for window layers — the app key of the window itself */
  refKey?: string;
  close: () => void;
}

interface BackState {
  stack: BackLayer[];
  /** timestamp of the last unconfirmed exit attempt (double-press guard) */
  armedAt: number;

  push: (layer: BackLayer) => void;
  remove: (id: string) => void;
  /** close layers above `depth` (used by the History bridge on popstate) */
  popTo: (depth: number) => void;
  /** one step back: top layer, or arm/confirm the exit guard */
  goBack: () => boolean;
}

export const useBack = create<BackState>()((set, get) => ({
  stack: [],
  armedAt: 0,

  push: (layer) =>
    set((s) => ({
      /* replace-by-id keeps layers unique, then the newest sits on top */
      stack: [...s.stack.filter((l) => l.id !== layer.id), layer],
    })),

  remove: (id) => set((s) => ({ stack: s.stack.filter((l) => l.id !== id) })),

  popTo: (depth) => {
    const s = get();
    if (depth >= s.stack.length) return;
    const closing = s.stack.slice(depth).reverse();
    /* detach first, then close — close() may mutate other stores */
    set({ stack: s.stack.slice(0, depth) });
    for (const l of closing) {
      try { l.close(); } catch { /* a layer may already be gone */ }
    }
  },

  goBack: () => {
    const s = get();
    if (s.stack.length > 0) {
      const top = s.stack[s.stack.length - 1];
      s.remove(top.id);
      try { top.close(); } catch { /* already closed */ }
      return true;
    }
    /* nothing left in-app — double-press guard before leaving */
    const now = Date.now();
    if (now - s.armedAt < EXIT_TOAST_MS) {
      set({ armedAt: 0 });
      window.location.href = "/";
      return true;
    }
    armExitGuard();
    return true;
  },
}));

function armExitGuard() {
  useBack.setState({ armedAt: Date.now() });
  toast("Press back again to exit Hospital OS", {
    description: "Your session stays signed in — the desktop is restored when you return.",
  });
}

/* ------------------------------------------------------------------ */
/* Declarative hook for views inside an app                            */
/* ------------------------------------------------------------------ */

/**
 * Registers a drill-down view (drawer, dialog, detail pane) on the
 * back stack while `active`. Pass a stable scope (the window key),
 * a destination label and a close callback. The callback identity
 * may change every render — the latest one is always used.
 */
export function useBackLayer(
  active: boolean,
  scope: string,
  label: string,
  close: () => void
) {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);

  const idRef = useRef(`v-${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    if (!active) return;
    const layer = {
      id: idRef.current,
      scope,
      kind: "view" as const,
      label,
      close: () => closeRef.current(),
    };
    useBack.getState().push(layer);
    return () => useBack.getState().remove(layer.id);
  }, [active, scope, label]);
}

/* ------------------------------------------------------------------ */
/* History bridge — device/browser back walks the in-app stack         */
/* ------------------------------------------------------------------ */

const EXIT_TOAST_MS = 2600;

/* defined below the store — hoisted function declaration */

/**
 * Merge our back-depth tag into the existing history state.
 * Next.js App Router keeps its own router tree inside history.state
 * (__PRIVATE_NEXTJS_INTERNALS_TREE) — wiping it makes every device
 * back look like a foreign navigation and hard-reloads the page.
 */
function nxState(nx: number): Record<string, unknown> {
  const base = (typeof history !== "undefined" ? history.state : null) as Record<string, unknown> | null;
  return { ...(base ?? {}), nx };
}

/**
 * Mirrors the back stack onto the browser history so hardware/browser
 * back pops in-app layers instead of leaving Hospital OS.
 *
 * History chain: [previous page] [base nx=0] [spare nx=0] [layers nx=1..n]
 * - push a layer  → pushState(nx = depth), a dedicated entry per layer
 * - UI close      → replaceState(nx = depth) — absorbs the closure into
 *                   the current entry; we NEVER traverse programmatically
 *                   (a queued history.back() would race same-tick pushes)
 * - popstate      → honor the back intent: close down to the reported
 *                   depth, or one layer when entries are stale-aligned
 * - at depth 0    → double-press guard before truly leaving
 */
export function useNxHistoryBridge(active: boolean, gate?: () => boolean) {
  useEffect(() => {
    if (!active) return;

    /* tag the entry the OS lives on, then keep one spare in-app entry
       so the *first* device back always lands inside our handler */
    try {
      history.replaceState(nxState(0), "");
      history.pushState(nxState(0), "");
    } catch { /* history unavailable (rare embeds) */ }

    const unsub = useBack.subscribe((s, prev) => {
      const depth = s.stack.length;
      const prevDepth = prev.stack.length;
      if (depth > prevDepth) {
        try { history.pushState(nxState(depth), ""); } catch { /* noop */ }
      } else if (depth < prevDepth) {
        /* UI-driven close — retag the current entry in place */
        try { history.replaceState(nxState(depth), ""); } catch { /* noop */ }
      }
    });

    const onPop = (e: PopStateEvent) => {
      /* while locked, swallow back presses — nothing may pop underneath */
      if (gate && !gate()) {
        try { history.pushState(nxState(useBack.getState().stack.length), ""); } catch { /* noop */ }
        return;
      }
      const st = (e.state ?? null) as { nx?: number } | null;
      const depth = useBack.getState().stack.length;
      const nx = st && typeof st.nx === "number" ? st.nx : null;

      /* at the base with nothing left in-app — guard the exit */
      if (nx === 0 && depth === 0) {
        const armed = Date.now() - useBack.getState().armedAt < EXIT_TOAST_MS;
        if (armed) {
          useBack.setState({ armedAt: 0 });
          window.location.href = "/";
        } else {
          armExitGuard();
          try { history.pushState(nxState(0), ""); } catch { /* noop */ }
        }
        return;
      }

      if (nx !== null && nx < depth) {
        /* walked back over dedicated layer entries — close down to it */
        useBack.getState().popTo(nx);
        return;
      }

      if (depth > 0) {
        /* stale-aligned or untagged entry — still honor the back intent
           by closing the topmost layer */
        useBack.getState().goBack();
        return;
      }

      /* nothing in-app to close; stay parked on the page */
      try { history.pushState(nxState(0), ""); } catch { /* noop */ }
    };

    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      unsub();
    };
  }, [active, gate]);
}

/* debug handle for e2e verification (harmless in production) */
if (typeof window !== "undefined") {
  (window as unknown as { __nxBack: typeof useBack }).__nxBack = useBack;
}
