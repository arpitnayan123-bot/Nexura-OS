"use client";

import { useEffect, useRef, useState } from "react";
import { KeyRound, LockKeyhole, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOs } from "./store";
import { useNow } from "./use-now";

/* ============================================================
   HOSPITAL OS — lock screen
   Sessions stay alive server-side; unlocking only lifts the
   local curtain. Demo PIN is 2468 (same as sign-in).
   ============================================================ */

export function NxLock({ user, onSignOut }: {
  user: { name: string; role: string; department?: string };
  onSignOut: () => void;
}) {
  const unlock = useOs((s) => s.unlock);
  const now = useNow(10_000);
  const [pin, setPin] = useState("");
  const [bad, setBad] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    if (pin === "2468") {
      unlock();
      return;
    }
    setBad(true);
    setPin("");
    setTimeout(() => setBad(false), 620);
  };

  const initials = user.name.split(" ").map((n) => n[0]).slice(0, 2).join("");

  return (
    <div className="nx-lock" role="dialog" aria-label="Screen locked">
      {/* big clock */}
      <div className="mb-8 text-center">
        <p className="nx-lock-clock nx-display text-[76px] leading-none text-ink">
          {now ? now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--"}
        </p>
        <p className="mt-2 text-[13px] font-medium text-ink-3">
          {now ? now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) : "—"}
        </p>
      </div>

      {/* unlock card */}
      <div className={cn("nx-lock-card", bad && "nx-lock-shake")}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-ink">{user.name}</p>
            <p className="truncate text-[11.5px] capitalize text-ink-3">{user.role}{user.department ? ` · ${user.department}` : ""}</p>
          </div>
          <LockKeyhole className="ml-auto h-4 w-4 text-ink-4" />
        </div>

        <div className="mt-5 flex items-center gap-2">
          <div className="relative flex-1">
            <KeyRound className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder="PIN"
              aria-label="Enter PIN to unlock"
              aria-invalid={bad}
              className={cn(
                "w-full rounded-xl border bg-inset py-2.5 pl-9 pr-3 text-[14px] tracking-[0.4em] text-ink outline-none transition placeholder:tracking-normal placeholder:text-ink-4",
                bad ? "border-crit" : "border-line focus:border-accent-line"
              )}
            />
          </div>
          <button
            onClick={submit}
            className="rounded-xl bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-ink transition hover:brightness-110 active:scale-[0.98]"
          >
            Unlock
          </button>
        </div>
        <p className={cn("mt-2.5 text-[11.5px]", bad ? "text-crit" : "text-ink-4")} role={bad ? "alert" : undefined}>
          {bad ? "Incorrect PIN — try again." : "Demo PIN · 2468 — your session stayed alive."}
        </p>
      </div>

      <button
        onClick={onSignOut}
        className="mt-6 flex items-center gap-1.5 text-[12px] text-ink-3 transition hover:text-ink"
      >
        <LogOut className="h-3.5 w-3.5" /> Sign out instead
      </button>
    </div>
  );
}
