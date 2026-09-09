"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ComponentType } from "react";

/* ============================================================
   HOSPITAL OS — context menu
   Shared by the desktop stage and window title bars.
   Fixed-position, viewport-clamped, Escape + outside-click to close.
   ============================================================ */

export interface CtxItem {
  kind?: "item" | "sep" | "label";
  label?: string;
  icon?: ComponentType<{ className?: string }>;
  kbd?: string;
  danger?: boolean;
  disabled?: boolean;
  checked?: boolean;
  onSelect?: () => void;
}

export function CtxMenu({ x, y, items, onClose }: {
  x: number;
  y: number;
  items: CtxItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: Math.min(x, window.innerWidth - r.width - 10),
      y: Math.min(y, window.innerHeight - r.height - 10),
    });
  }, [x, y]);

  useEffect(() => {
    const close = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    window.addEventListener("pointerdown", close, true);
    window.addEventListener("keydown", key, true);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("pointerdown", close, true);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="nx-ctx" role="menu" style={{ left: pos.x, top: pos.y }}>
      {items.map((it, i) => {
        if (it.kind === "sep") return <div key={i} className="nx-ctx-sep" role="separator" />;
        if (it.kind === "label") return <p key={i} className="nx-ctx-label">{it.label}</p>;
        const Icon = it.icon;
        return (
          <button
            key={i}
            role="menuitem"
            className="nx-ctx-item"
            data-danger={it.danger}
            data-dis={it.disabled || undefined}
            disabled={it.disabled}
            onClick={() => { onClose(); it.onSelect?.(); }}
          >
            {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" /> : <span className="w-3.5 shrink-0" />}
            <span className="flex-1 truncate">{it.label}</span>
            {it.checked && <span aria-hidden className="text-accent">✓</span>}
            {it.kbd && <kbd className="rounded border border-line-2 bg-inset px-1 py-px text-[9.5px] text-ink-4">{it.kbd}</kbd>}
          </button>
        );
      })}
    </div>
  );
}
