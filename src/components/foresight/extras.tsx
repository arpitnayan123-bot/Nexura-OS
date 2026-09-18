"use client";

/* ============================================================
 * FORESIGHT EXTRAS — history (trend sparkline + run list),
 * settings (language, data wipe), doctor-summary sheet.
 * ============================================================ */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Check, Copy, Download, Trash2 } from "lucide-react";
import type { ForesightReport } from "@/modules/foresight/types";
import { DOMAIN_META } from "./viz";
import { Eyebrow, GlassCard, SectionHead, tr, type FsLang } from "./ui";
import { cn } from "@/lib/utils";

export interface HistoryRun {
  id: string;
  score: number;
  band: string;
  triageLevel: string;
  topDomainId: string;
  engineVer: string;
  createdAt: string;
}

export function Sparkline({ series }: { series: { at: string; score: number }[] }) {
  if (series.length < 2) return null;
  const w = 560;
  const h = 120;
  const pad = 18;
  const x = (i: number) => pad + (i / (series.length - 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - v / 100) * (h - pad * 2);
  const d = series
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`)
    .join(" ");
  const last = series[series.length - 1];
  const first = series[0];
  const up = last.score >= first.score;
  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="block w-full"
        role="img"
        aria-label={`Score trend from ${first.score} to ${last.score}`}
      >
        <motion.path
          d={d}
          fill="none"
          stroke={up ? "#2DD4BF" : "#FB7185"}
          strokeWidth="2.2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
        <circle cx={x(series.length - 1)} cy={y(last.score)} r="4" fill="#F4F9FF" />
      </svg>
      <p className="mt-1 text-center text-[12px] nxf-mute">
        {series.length} runs ·{" "}
        <span className={up ? "nxf-teal" : "nxf-rose"}>
          {up ? "+" : ""}
          {last.score - first.score} since first check-in
        </span>
      </p>
    </div>
  );
}

export function HistoryView({
  lang,
  onOpen,
  onBack,
}: {
  lang: FsLang;
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  const [runs, setRuns] = useState<HistoryRun[]>([]);
  const [series, setSeries] = useState<{ at: string; score: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/nx/foresight/history")
      .then((r) => r.json())
      .then((j) => {
        if (!alive || !j?.ok) return;
        setRuns(j.data.runs ?? []);
        setSeries(j.data.scoreSeries ?? []);
      })
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <SectionHead
        eyebrow={tr(lang, "app.history")}
        title="Your trajectory so far"
        sub={
          runs.length ? "Every run is stamped with the engine version that produced it." : undefined
        }
      />
      {loading ? (
        <p className="py-16 text-center text-sm nxf-mute">Loading…</p>
      ) : runs.length === 0 ? (
        <GlassCard className="p-10 text-center" hover={false}>
          <p className="text-sm nxf-dim">No runs yet. Your first foresight map will appear here.</p>
          <button type="button" className="nxf-cta mt-5" onClick={onBack}>
            {tr(lang, "app.home")}
          </button>
        </GlassCard>
      ) : (
        <div className="space-y-5">
          {series.length >= 2 && (
            <GlassCard className="p-5" hover={false}>
              <Sparkline series={series} />
            </GlassCard>
          )}
          <div className="space-y-2.5">
            {runs.map((r, i) => {
              const prev = runs[i + 1]; // list is newest-first
              const delta = prev ? r.score - prev.score : null;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onOpen(r.id)}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left transition hover:border-amber-300/50"
                >
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold nxf-hi">
                      {new Date(r.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {r.triageLevel !== "STANDARD" && (
                        <span className="ml-2 rounded-full border border-rose-400/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider nxf-rose">
                          {r.triageLevel}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[12px] nxf-mute">
                      top domain:{" "}
                      {DOMAIN_META[r.topDomainId as keyof typeof DOMAIN_META]?.label ??
                        r.topDomainId}{" "}
                      · {r.band.toLowerCase()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {delta != null && delta !== 0 && (
                      <span
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold",
                          delta > 0
                            ? "border-emerald-300/35 bg-emerald-300/[0.08] text-emerald-200"
                            : "border-rose-300/30 bg-rose-300/[0.06] text-rose-200",
                        )}
                      >
                        {delta > 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    )}
                    <div className="text-right">
                      <p className="nxf-mono text-xl font-bold nxf-gold">{r.score}</p>
                      <p className="text-[10px] uppercase tracking-wider nxf-mute">score</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- settings ---------------- */

export function SettingsView({
  lang,
  onLang,
  onBack,
}: {
  lang: FsLang;
  onLang: (l: FsLang) => void;
  onBack: () => void;
}) {
  const [deleted, setDeleted] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [exported, setExported] = useState(false);
  const wipe = async () => {
    const r = await fetch("/api/nx/foresight/data", { method: "DELETE" })
      .then((x) => x.json())
      .catch(() => null);
    if (r?.ok) {
      setDeleted(r.data.deleted);
      /* "delete everything" must be literally true — the local
         draft check-in lives in localStorage, so it goes too */
      try {
        window.localStorage.removeItem("nx_fs_form");
      } catch {
        /* private mode */
      }
    }
    setConfirming(false);
  };
  const exportData = async () => {
    try {
      const runs = await fetch("/api/nx/foresight/history")
        .then((x) => x.json())
        .catch(() => null);
      let form: unknown = null;
      try {
        form = JSON.parse(window.localStorage.getItem("nx_fs_form") ?? "null");
      } catch {
        /* private mode */
      }
      const payload = {
        exportedAt: new Date().toISOString(),
        product: "Nexura Predictive 2.0 — Health Foresight",
        engine: "foresight-2.0.0 · india-cal-2.0.0",
        note: "Signal levels within screening scope — not diagnoses. Exported by and from the user's own browser session.",
        checkInAnswers: form,
        runs: runs?.ok ? runs.data.runs : [],
        scoreSeries: runs?.ok ? runs.data.scoreSeries : [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nexura-foresight-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExported(true);
      setTimeout(() => setExported(false), 2400);
    } catch {
      /* blocked — silent */
    }
  };
  return (
    <div className="space-y-6">
      <SectionHead
        eyebrow={tr(lang, "app.settings")}
        title="Controls & data"
        sub="Everything here is yours; nothing here is required."
      />
      <GlassCard className="p-5" hover={false}>
        <Eyebrow className="mb-3">Language</Eyebrow>
        <div className="flex gap-2">
          <button
            type="button"
            className="nxf-pill"
            aria-pressed={lang === "en"}
            onClick={() => onLang("en")}
          >
            English
          </button>
          <button
            type="button"
            className="nxf-pill"
            aria-pressed={lang === "hi"}
            onClick={() => onLang("hi")}
          >
            हिंदी
          </button>
        </div>
      </GlassCard>
      <GlassCard className="p-5" hover={false}>
        <Eyebrow className="mb-3">Your data, portable</Eyebrow>
        <p className="mb-3 text-[13px] leading-relaxed nxf-dim">
          Download everything this browser has shared with the engine — your check-in answers and
          every run summary — as one JSON file you can keep, print or carry to a doctor.
        </p>
        <button type="button" className="nxf-cta nxf-cta-ghost" onClick={() => void exportData()}>
          {exported ? (
            <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" />
          ) : (
            <Download className="h-4 w-4" aria-hidden="true" />
          )}
          {exported ? "Downloaded — check your files" : "Download my data (JSON)"}
        </button>
      </GlassCard>
      <GlassCard className="p-5" hover={false}>
        <Eyebrow className="mb-3">Danger zone</Eyebrow>
        {deleted != null ? (
          <p className="flex items-center gap-2 text-sm nxf-dim">
            <Check className="h-4 w-4 text-emerald-300" /> Deleted {deleted} run
            {deleted === 1 ? "" : "s"}. This browser now starts fresh.
          </p>
        ) : confirming ? (
          <div className="flex flex-wrap gap-2">
            <p className="w-full text-[13px] nxf-body">
              Delete every stored run for this browser? This cannot be undone.
            </p>
            <button
              type="button"
              className="nxf-cta !from-rose-600 !to-rose-500 !text-white"
              onClick={() => void wipe()}
            >
              <Trash2 className="h-4 w-4" /> Yes, delete everything
            </button>
            <button
              type="button"
              className="nxf-cta nxf-cta-ghost"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="nxf-cta nxf-cta-ghost"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete all my runs
          </button>
        )}
      </GlassCard>
      <button type="button" className="nxf-cta nxf-cta-ghost" onClick={onBack}>
        {tr(lang, "app.back")}
      </button>
    </div>
  );
}

/* ---------------- doctor summary sheet ---------------- */

export function SummarySheet({ text, onClose }: { text: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* blocked */
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Doctor summary"
    >
      <div className="nxf-glass max-h-[85vh] w-full max-w-2xl overflow-y-auto p-5 sm:p-6 nxf-scroll">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold nxf-hi">Clinician handoff summary</h2>
          <button type="button" className="nxf-pill" onClick={onClose}>
            Close
          </button>
        </div>
        <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.06] p-4 text-[12px] leading-relaxed nxf-body">
          {text}
        </pre>
        <button type="button" className="nxf-cta mt-4" onClick={() => void copy()}>
          <Copy className="h-4 w-4" /> {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
