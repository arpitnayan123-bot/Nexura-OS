"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* ============================================================
   HOSPITAL OS — shared modal shell
   One accessible dialog for every surface: radix gives focus
   trap, Escape handling, aria wiring, and scroll lock; OS
   tokens keep it theme-correct in light and dark (the five
   hand-rolled copies before this used hard-coded dark hex
   backgrounds that rendered dark-on-dark in light theme).
   Modules keep owning their back-stack layer (useBackLayer).
   ============================================================ */

export function NxModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={subtitle ? undefined : undefined}
        className={cn(
          "nx-pop-center !fixed left-1/2 top-[14%] translate-y-0 gap-0 overflow-hidden rounded-2xl border-line bg-panel p-5",
          wide ? "w-[min(680px,calc(100vw-24px))]" : "w-[min(480px,calc(100vw-24px))]",
        )}
      >
        <DialogTitle className="text-sm font-semibold text-ink">{title}</DialogTitle>
        {subtitle ? (
          <DialogDescription className="mt-0.5 text-[11px] text-ink-3">
            {subtitle}
          </DialogDescription>
        ) : null}
        <div className="mt-3 space-y-2.5">{children}</div>
        {footer ? <div className="mt-4 flex items-center justify-end gap-2">{footer}</div> : null}
      </DialogContent>
    </Dialog>
  );
}

/** Shared OS input style — matches every legacy hand-rolled dialog field. */
export const nxField =
  "w-full rounded-lg border border-line-2 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent-line disabled:opacity-60";
