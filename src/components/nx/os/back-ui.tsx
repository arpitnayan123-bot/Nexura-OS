"use client";

import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { appFor } from "./registry";
import { useOs } from "./store";
import { useBack, type BackLayer } from "./back";

/* ============================================================
   HOSPITAL OS — back navigation UI
   The console keeps two controls from the previous shell:
   • NxBackSync — keeps shell overlays (palette, notifications,
     quick settings) on the back stack so device back and Escape
     dismiss them in LIFO order.
   • NxBackFab — floating glass arrow (mobile), always one tap
     from the previous screen, with a live count of layers.
   ============================================================ */

interface OverlayDef {
  id: string;
  flag: "paletteOpen" | "quickOpen" | "notifOpen";
  label: string;
}

const OVERLAYS: OverlayDef[] = [
  { id: "ov:palette", flag: "paletteOpen", label: "Command palette" },
  { id: "ov:quick", flag: "quickOpen", label: "Quick settings" },
  { id: "ov:notif", flag: "notifOpen", label: "Notifications" },
];

/* keep shell overlays on the back stack */
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
  /* module navigation layer — name the module it returns to */
  if (top.kind === "window") {
    if (top.prevKey) {
      const prev = appFor(top.prevKey);
      if (prev) return `Back to ${prev.label}`;
    }
    const self = top.refKey ? appFor(top.refKey) : undefined;
    return self ? `Back from ${self.label}` : "Back";
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
