"use client";

import { Empty, ErrorState, Loading, Panel, Pill, Stat, StatusPill } from "./bits";
import { useNx, timeAgo } from "./client";

/* ============================================================
   REVENUE CYCLE — charges, claims, leakage signals
   ============================================================ */

interface BillingData {
  stats: {
    totalBilled: number; collected: number; pending: number; collectionPct: number;
    claimsSubmitted: number; claimsApproved: number; claimsQuery: number; claimsRejected: number;
  };
  bills: Array<{ id: string; patient: { fullName: string; uhid: string }; uhid: string; amount: number; paymentStatus: string; paymentMode: string; createdAt: string }>;
  claims: Array<{ id: string; patient: { fullName: string; uhid: string }; tpa: string; policy: string | null; icd10: string | null; estimated: number; approved: number; status: string; submittedAt: string | null; createdAt: string }>;
}

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function BillingCenter() {
  const { data, error, loading, refresh } = useNx<BillingData>("/api/nx/billing");

  if (loading) return <Loading rows={5} label="Loading revenue cycle…" />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;
  if (!data) return <Empty title="No data" />;

  const s = data.stats;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total billed" value={inr(s.totalBilled)} icon={<Receipt />} />
        <Stat label="Collected" value={inr(s.collected)} sub={`${s.collectionPct}% collection rate`} tone="good" />
        <Stat label="Pending" value={inr(s.pending)} tone={s.pending > s.collected ? "warn" : "default"} />
        <Stat label="Claims" value={s.claimsSubmitted} sub={`${s.claimsApproved} approved · ${s.claimsQuery} queries · ${s.claimsRejected} rejected`} tone="info" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Patient bills" subtitle="Clinical activity linked to financial workflow — patient-friendly statements">
          {data.bills.length === 0 ? <Empty title="No bills" /> : (
            <div className="nx-scroll max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {data.bills.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-ink">{b.patient.fullName} <span className="text-ink-3">{b.patient.uhid}</span></p>
                    <p className="text-[11px] text-ink-3">{b.paymentMode} · {timeAgo(b.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs font-semibold tabular-nums text-ink">{inr(b.amount)}</span>
                    <StatusPill status={b.paymentStatus} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="TPA / insurance claims" subtitle="Pre-auth → query → approval pipeline (IRDAI-aligned)">
          {data.claims.length === 0 ? <Empty title="No claims" /> : (
            <div className="nx-scroll max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {data.claims.map((c) => (
                <div key={c.id} className="rounded-lg border border-line bg-panel px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium text-ink">{c.patient.fullName} · {c.tpa}</p>
                    <StatusPill status={c.status} />
                  </div>
                  <p className="text-[11px] text-ink-3">
                    {c.icd10 || "ICD-10 pending"} · est {inr(c.estimated)}{c.approved > 0 && ` · approved ${inr(c.approved)}`} · {c.submittedAt ? `submitted ${timeAgo(c.submittedAt)}` : "not submitted"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Revenue integrity notes">
        <div className="flex flex-wrap gap-1.5">
          <Pill tone="good">Every charge traces to a clinical order</Pill>
          <Pill tone="info">AI flags missing documentation — never fabricates facts</Pill>
          <Pill tone="warn">High-risk claims hold for human review before submission</Pill>
        </div>
      </Panel>
    </div>
  );
}

function Receipt() {
  return <span className="text-ink-3">₹</span>;
}
