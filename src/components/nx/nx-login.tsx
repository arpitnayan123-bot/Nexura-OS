"use client";

import { useState } from "react";
import { Activity, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { nx } from "./client";

/* ============================================================
   HOSPITAL OS — staff sign-in
   Ambient scene, glass auth card. PIN 2468 for all seeded staff.
   ============================================================ */

const DEMO_ACCOUNTS = [
  { code: "DR.RAJESH", name: "Dr. Rajesh Sharma", role: "Doctor", desc: "Clinical workspace, orders, EHR" },
  { code: "NS.PRIYA", name: "Nurse Priya Singh", role: "Nurse", desc: "Shift workspace, medication, tasks" },
  { code: "CMD.ANITA", name: "Anita Desai", role: "Command Center", desc: "Live hospital overview, coordination" },
  { code: "LAB.SURESH", name: "Suresh Patel", role: "Laboratory", desc: "Specimen queue, result validation" },
  { code: "RX.KAVITA", name: "Kavita Verma", role: "Pharmacy", desc: "Verification, dispensing, stock" },
  { code: "ADM.SUNIL", name: "Sunil Menon", role: "Administrator", desc: "Full access, automation config" },
  { code: "CEO.NEHA", name: "Neha Kulkarni", role: "Leadership", desc: "Analytics, finance, compliance" },
  { code: "FAC.RAKESH", name: "Rakesh Yadav", role: "Facilities", desc: "Beds, equipment, cleaning" },
];

export function NxLogin({ onSignedIn }: { onSignedIn: (user: { id: string; name: string; role: string; department?: string; hospitalId?: string }, modules: string[]) => void }) {
  const [code, setCode] = useState("CMD.ANITA");
  const [pin, setPin] = useState("2468");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await nx<{ user: { id: string; name: string; role: string; department?: string; hospitalId?: string }; modules: string[] }>("/api/nx/auth", {
        method: "POST",
        body: JSON.stringify({ staffCode: code, pin }),
      });
      onSignedIn(res.user, res.modules);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Check the staff code and PIN, then try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      {/* ambient scene */}
      <div className="nx-sky" aria-hidden>
        <div className="nx-blob left-[-12%] top-[-22%] h-[60vh] w-[55vw]" style={{ background: "var(--nx-sky-1)" }} />
        <div className="nx-blob nx-blob-b right-[-18%] top-[6%] h-[55vh] w-[48vw]" style={{ background: "var(--nx-sky-3)" }} />
        <div className="nx-blob nx-blob-c bottom-[-30%] left-[20%] h-[50vh] w-[52vw]" style={{ background: "var(--nx-sky-2)" }} />
      </div>

      <div className="relative grid w-full max-w-4xl gap-10 py-10 md:grid-cols-[1fr_1.15fr] md:gap-12">
        {/* brand moment */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-3.5">
            <div className="nx-brand-glyph h-12 w-12 rounded-2xl">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="nx-display text-[26px] leading-tight text-ink">Hospital OS</h1>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-4">by Nexura · v3 “Meridian”</p>
            </div>
          </div>
          <p className="mt-7 max-w-sm text-[13.5px] leading-relaxed text-ink-2">
            One connected system for every person, department, workflow, room and decision —
            a calm command layer over the entire hospital.
          </p>
          <div className="mt-7 space-y-2.5 text-[12px] text-ink-3">
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-good" /> Role-based access with audited actions</p>
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-good" /> Break-glass policy enforced on every record</p>
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-good" /> Governed AI — it assists, clinicians decide</p>
          </div>
        </div>

        {/* auth card */}
        <form onSubmit={signIn} className="nx-glass-2 nx-sheen rounded-3xl border border-line p-6 shadow-[var(--nx-e4)]">
          <h2 className="text-[15px] font-semibold text-ink">Staff sign-in</h2>
          <p className="mt-1 text-xs text-ink-3">Pick a demo identity — every role sees a different OS.</p>

          <label htmlFor="nx-code" className="mt-5 block text-[11px] font-medium uppercase tracking-wider text-ink-3">Staff code</label>
          <input
            id="nx-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line-2 bg-inset px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-4 focus:border-accent-line"
            placeholder="e.g. DR.RAJESH"
            autoComplete="username"
          />
          <label htmlFor="nx-pin" className="mt-3.5 block text-[11px] font-medium uppercase tracking-wider text-ink-3">PIN</label>
          <input
            id="nx-pin"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            type="password"
            inputMode="numeric"
            className="mt-1.5 w-full rounded-xl border border-line-2 bg-inset px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent-line"
            placeholder="••••"
            autoComplete="current-password"
          />

          {error && (
            <p role="alert" className="mt-3.5 rounded-xl border border-crit-line bg-crit-soft px-3 py-2 text-xs text-crit">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink shadow-[var(--nx-e2)] transition hover:bg-accent-2 active:scale-[0.99] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Signing in…" : "Sign in to Hospital OS"}
          </button>

          <div className="mt-6 border-t border-line pt-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-4">Demo identities · PIN 2468</p>
            <div className="nx-scroll mt-2.5 grid max-h-48 grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.code}
                  type="button"
                  onClick={() => { setCode(a.code); setPin("2468"); }}
                  aria-pressed={code === a.code}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left transition",
                    code === a.code
                      ? "border-accent-line bg-accent-soft"
                      : "border-line bg-inset hover:border-line-2"
                  )}
                >
                  <p className="truncate text-[12px] font-medium text-ink">{a.role}</p>
                  <p className="truncate font-mono text-[10px] text-ink-4">{a.code}</p>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
