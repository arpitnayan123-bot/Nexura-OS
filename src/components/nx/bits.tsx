"use client";

import { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================
   HOSPITAL OS — design-system primitives (calm, dense, readable)
   ============================================================ */

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  tone,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "default" | "critical" | "attention";
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-line bg-panel backdrop-blur-sm",
        tone === "critical" && "border-crit-line shadow-[0_0_28px_-10px_var(--nx-crit)]",
        tone === "attention" && "border-warn-line",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {title && (
              <h3 className="truncate text-sm font-semibold tracking-tight text-ink">{title}</h3>
            )}
            {subtitle && <p className="truncate text-xs text-ink-3">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "good" | "warn" | "critical" | "info";
  icon?: ReactNode;
}) {
  const toneCls = {
    default: "text-ink",
    good: "text-good",
    warn: "text-warn",
    critical: "text-crit",
    info: "text-info",
  }[tone];
  return (
    <div className="rounded-xl border border-line bg-panel px-4 py-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-3">{label}</p>
        {icon && <span className="text-ink-4">{icon}</span>}
      </div>
      <p className={cn("mt-1.5 text-2xl font-bold tabular-nums leading-none", toneCls)}>{value}</p>
      {sub && <p className="mt-1.5 text-xs text-ink-3">{sub}</p>}
    </div>
  );
}

const PILL_TONES: Record<string, string> = {
  neutral: "bg-inset text-ink-2 border-line-2",
  good: "bg-good-soft text-good border-good-line",
  warn: "bg-warn-soft text-warn border-warn-line",
  critical: "bg-crit-soft text-crit border-crit-line",
  info: "bg-info-soft text-info border-info-line",
  violet: "bg-vio-soft text-vio border-vio-line",
};

export function Pill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof PILL_TONES;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const STATUS_TONE: Record<string, keyof typeof PILL_TONES> = {
  // bed lifecycle
  occupied: "info",
  discharge_pending: "warn",
  cleaning_required: "warn",
  cleaning_in_progress: "violet",
  inspection_required: "info",
  ready: "good",
  reserved: "violet",
  available: "neutral",
  // order / task status
  open: "info",
  in_progress: "violet",
  blocked: "critical",
  done: "good",
  cancelled: "neutral",
  ordered: "info",
  acknowledged: "violet",
  completed: "good",
  // priority
  critical: "critical",
  high: "warn",
  medium: "info",
  low: "neutral",
  stat: "critical",
  urgent: "warn",
  routine: "neutral",
  // flags
  normal: "good",
  abnormal: "warn",
  // incidents
  minor: "warn",
  major: "critical",
  info: "neutral",
  investigating: "warn",
  resolved: "good",
  closed: "neutral",
  // schedule
  scheduled: "info",
  waiting: "warn",
  no_show: "critical",
  paid: "good",
  unpaid: "warn",
  partial: "warn",
  refunded: "neutral",
  approved: "good",
  query_raised: "warn",
  rejected: "critical",
  submitted: "info",
  draft: "neutral",
  in_service: "good",
  maintenance: "warn",
  fault: "critical",
  retired: "neutral",
  running: "info",
  awaiting_approval: "warn",
  failed: "critical",
  active: "good",
  discharged: "neutral",
  transferred: "info",
  expired: "critical",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <Pill tone={STATUS_TONE[status] || "neutral"} className={className}>
      {status.replace(/_/g, " ")}
    </Pill>
  );
}

export function Empty({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="text-ink-4">{icon}</div>}
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {hint && <p className="max-w-sm text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-crit-line bg-crit-soft px-6 py-8 text-center">
      <AlertTriangle className="h-5 w-5 text-crit" />
      <p className="text-sm text-ink">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-md border border-crit-line px-3 py-1 text-xs text-crit hover:bg-crit-soft"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function Loading({ rows = 3, label }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-2.5">
      {label && <p className="text-xs text-ink-3">{label}</p>}
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full bg-inset" />
      ))}
    </div>
  );
}

export function PermissionState({ module }: { module: string }) {
  return (
    <Empty
      icon={<XCircle className="h-8 w-8" />}
      title="Access restricted"
      hint={`Your role does not include the "${module.replace(/-/g, " ")}" module. Hospital OS enforces role-based access — ask an administrator to grant it.`}
    />
  );
}

export function AiBanner({ disclaimer }: { disclaimer: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-vio-line bg-vio-soft px-3 py-2">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-vio" />
      <p className="text-[11px] leading-relaxed text-ink-2">
        <span className="font-semibold text-vio">AI-generated</span> — {disclaimer}
      </p>
    </div>
  );
}

export function MiniBar({
  pct,
  tone = "brand",
}: {
  pct: number;
  tone?: "brand" | "good" | "warn" | "critical";
}) {
  const cls = { brand: "bg-accent", good: "bg-good", warn: "bg-warn", critical: "bg-crit" }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-inset">
      <div
        className={cn("h-full rounded-full transition-all", cls)}
        style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
      />
    </div>
  );
}

export function OkBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-good" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-ink-4" />
      )}
      <span className={ok ? "text-ink-2" : "text-ink-3"}>{label}</span>
    </span>
  );
}
