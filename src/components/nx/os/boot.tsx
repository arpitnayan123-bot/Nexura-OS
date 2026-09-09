"use client";

import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================
   HOSPITAL OS — boot splash
   Shown while the session is verified and for a minimum beat,
   so starting the OS feels deliberate, never flickery.
   ============================================================ */

export function NxBoot({ leaving }: { leaving?: boolean }) {
  return (
    <div className={cn("nx-boot", leaving && "nx-boot-out")} aria-label="Starting Hospital OS" role="status">
      <span className="nx-brand-glyph nx-boot-mark h-14 w-14 rounded-[18px]">
        <Activity className="h-7 w-7" />
      </span>
      <div className="text-center">
        <p className="nx-display text-[26px] leading-tight text-ink">Hospital OS</p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-4">
          Nexura · v3 “Meridian”
        </p>
      </div>
      <div className="nx-boot-bar" aria-hidden>
        <span />
      </div>
      <p className="text-[12px] text-ink-3">Preparing the care environment…</p>
    </div>
  );
}
