"use client";

/* ============================================================
 * NEXURA DIY — SETTINGS
 * Granular consent (9 switches), honest guest-data banner,
 * JSON export (9 sections), two-step wipe.
 * ============================================================ */

import { useCallback, useEffect, useState } from "react";
import { Download, Trash2, ShieldCheck } from "lucide-react";
import { diyFetch, type ConsentScopeRow } from "./client-types";

export function SettingsView() {
  const [scopes, setScopes] = useState<ConsentScopeRow[]>([]);
  const [guest, setGuest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wipeArm, setWipeArm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [consent, session] = await Promise.all([
      diyFetch<{ scopes: ConsentScopeRow[] }>("/api/diy/consent"),
      diyFetch<{ mode: string }>("/api/diy/session"),
    ]);
    setScopes(consent.scopes);
    setGuest(session.mode === "guest");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleScope = async (scope: string, granted: boolean) => {
    setBusy(true);
    try {
      if (granted) {
        await diyFetch("/api/diy/consent", {
          method: "POST",
          body: JSON.stringify({
            scopes: [scope],
            policyVersion: "2026-09-diy-1",
            source: "settings",
          }),
        });
      } else {
        await diyFetch("/api/diy/consent", {
          method: "DELETE",
          body: JSON.stringify({ scopes: [scope] }),
        });
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const exportData = async () => {
    setBusy(true);
    try {
      const res = await diyFetch<{ exportedAt: string; sections: Record<string, unknown> }>(
        "/api/diy/me",
      );
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nexura-diy-export-${res.exportedAt.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice("Export downloaded — nine sections, everything we hold.");
    } finally {
      setBusy(false);
    }
  };

  const wipe = async () => {
    if (!wipeArm) {
      setWipeArm(true);
      setNotice("Tap again to confirm — this cannot be undone.");
      return;
    }
    setBusy(true);
    try {
      await diyFetch("/api/diy/me", {
        method: "DELETE",
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      setWipeArm(false);
      setNotice("All DIY data wiped. A fresh plan can start whenever you are ready.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-[min(94%,680px)] space-y-5 pb-28 pt-8">
      <header>
        <h1 className="text-xl font-semibold text-[#2E2A26]">Settings</h1>
        <p className="mt-1 text-sm text-[#6B5D4E]">Your data, your call — granular and honest.</p>
      </header>

      {guest && (
        <section className="rounded-2xl border border-[#EAD9C0] bg-[#FBF3E4] p-4 text-xs leading-relaxed text-[#7A5C36]">
          <strong className="block text-[13px]">You are using DIY without signing in</strong>
          Your plan is tied to this browser. Clearing cookies or switching devices starts fresh.
          Sign in through the patient portal anytime to keep your plan across devices.
        </section>
      )}

      <section className="nx-glass-deep rounded-3xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck size={16} className="text-[#4E6845]" aria-hidden />
          <p className="text-sm font-semibold text-[#2E2A26]">Consent — nine granular switches</p>
        </div>
        <div className="space-y-2">
          {scopes.map((s) => (
            <label
              key={s.scope}
              className="flex items-center justify-between gap-3 rounded-2xl bg-[#FBF5EA] px-4 py-3"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-[#2E2A26]">
                  {s.scope.replace(/_/g, " ").toLowerCase()}
                </span>
                <span className="block text-[11px] leading-snug text-[#6B5D4E]">{s.purpose}</span>
              </span>
              <button
                role="switch"
                aria-checked={s.granted}
                aria-label={`${s.granted ? "Withdraw" : "Grant"} ${s.scope}`}
                disabled={busy}
                onClick={() => toggleScope(s.scope, !s.granted)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${s.granted ? "bg-[#7A9A7B]" : "bg-[#D9C8AC]"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${s.granted ? "left-[22px]" : "left-0.5"}`}
                />
              </button>
            </label>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-[#A08D74]">
          Withdrawing stops future processing immediately. MODEL_TRAINING is separate and explicit —
          never bundled with anything.
        </p>
      </section>

      <section className="rounded-3xl border border-[#EADDC7] bg-[#FFFDF8] p-5">
        <p className="text-sm font-semibold text-[#2E2A26]">Your data</p>
        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
          <button onClick={exportData} disabled={busy} className="diy-btn-primary flex-1 text-sm">
            <Download size={15} aria-hidden /> Export everything (JSON)
          </button>
          <button
            onClick={wipe}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#C0392B]/50 px-4 py-3 text-sm font-medium text-[#A93226] transition hover:bg-[#FDEBE8]"
          >
            <Trash2 size={15} aria-hidden /> {wipeArm ? "Tap again to wipe" : "Wipe all DIY data"}
          </button>
        </div>
        {notice && (
          <p className="mt-3 rounded-xl bg-[#FBF5EA] p-3 text-xs leading-relaxed text-[#6B5D4E]">
            {notice}
          </p>
        )}
      </section>
    </div>
  );
}
