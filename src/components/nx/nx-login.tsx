"use client";

import { useState } from "react";
import { Activity, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, ShieldCheck, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { nx } from "./client";

/* ============================================================
   HOSPITAL OS — staff sign-in v3
   Email+password (production) · Staff code+PIN (demo fast path)
   MFA step-up · Progressive lockout messaging · Forgot password
   Demo identities sign in through the exact same flow.
   ============================================================ */

interface DemoAccount {
  code: string;
  email: string;
  name: string;
  role: string;
  desc: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { code: "SA.DEV", email: "superadmin@demo.nexura.health", name: "Devika Rao", role: "Super Admin", desc: "Entire platform, every hospital, every setting" },
  { code: "ADM.SUNIL", email: "admin@demo.nexura.health", name: "Sunil Menon", role: "Hospital Administrator", desc: "Full hospital access: users, roles, settings, audit" },
  { code: "DR.RAJESH", email: "doctor@demo.nexura.health", name: "Dr. Rajesh Sharma", role: "Doctor", desc: "Clinical workspace, orders, notes, sign-off" },
  { code: "NS.PRIYA", email: "nurse@demo.nexura.health", name: "Nurse Priya Singh", role: "Nurse", desc: "Shift tasks, medication administration, vitals" },
  { code: "RC.MEERA", email: "reception@demo.nexura.health", name: "Meera Iyer", role: "Receptionist", desc: "Appointments, check-in, patient registration" },
  { code: "RX.KAVITA", email: "pharmacy@demo.nexura.health", name: "Kavita Verma", role: "Pharmacist", desc: "Verification, dispensing, stock, MAR" },
  { code: "LAB.SURESH", email: "lab@demo.nexura.health", name: "Suresh Patel", role: "Lab Technician", desc: "Specimen queue, result entry, validation" },
  { code: "BILL.ARVIND", email: "billing@demo.nexura.health", name: "Arvind Gupta", role: "Billing Officer", desc: "Charges, payments, claims, export" },
  { code: "PAT.ARBOR", email: "patient@demo.nexura.health", name: "Arbor Mehta (Patient)", role: "Patient", desc: "Own record only — appointments and demographics" },
  { code: "CEO.NEHA", email: "executive@demo.nexura.health", name: "Neha Kulkarni", role: "Operations Executive", desc: "Analytics, revenue, compliance overview" },
];

type Mode = "password" | "pin";

export function NxLogin({ onSignedIn }: {
  onSignedIn: (user: { id: string; name: string; role: string; department?: string; hospitalId?: string }, modules: string[]) => void;
}) {
  const [mode, setMode] = useState<Mode>("pin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [code, setCode] = useState("CMD.ANITA");
  const [pin, setPin] = useState("2468");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState<{ mfaToken: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [showDemo, setShowDemo] = useState(false);

  async function submit(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await nx<{
        user?: { id: string; name: string; role: string; department?: string; hospitalId?: string };
        modules?: string[];
        mfa_required?: boolean;
        mfa_token?: string;
      }>("/api/nx/auth", { method: "POST", body: JSON.stringify(body) });
      if (res.mfa_required && res.mfa_token) {
        setMfaRequired({ mfaToken: res.mfa_token });
        setNotice("Enter the 6-digit code from your authenticator app.");
        return;
      }
      if (res.user) onSignedIn(res.user, res.modules ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-in failed.";
      setError(msg);
      if (/locked/i.test(msg)) setNotice(null);
    } finally {
      setBusy(false);
    }
  }

  function submitPassword(e?: React.FormEvent) {
    e?.preventDefault();
    if (mfaRequired) {
      void submit({ ...currentPayload(), mfaToken: mfaRequired.mfaToken, mfaCode });
    } else {
      void submit(currentPayload());
    }
  }

  function currentPayload(): Record<string, unknown> {
    if (mode === "password") {
      return { email: email.trim(), password, rememberDevice: remember, ...(mfaRequired ? { mfaToken: mfaRequired.mfaToken, mfaCode } : {}) };
    }
    return { staffCode: code.trim(), pin, rememberDevice: remember };
  }

  async function forgotPassword() {
    if (!email.trim()) {
      setError("Enter your email above first, then tap Forgot password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await nx<{ data?: { message?: string } }>("/api/nx/auth/password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setNotice(res.data?.message ?? "If that email exists, a reset link has been sent.");
    } catch {
      setNotice("If that email exists, a reset link has been sent.");
    } finally {
      setBusy(false);
    }
  }

  function pickDemo(a: DemoAccount) {
    setMode("password");
    setEmail(a.email);
    setPassword("Demo@12345");
    setMfaRequired(null);
    setNotice(`Demo credentials for ${a.role} filled in — press “Sign in” to continue.`);
    setError(null);
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
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-4">by Nexura · v4 “Foundation”</p>
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
          <div className="mt-6 inline-flex items-center gap-2 self-start rounded-full border border-accent-line bg-accent-soft px-3 py-1.5 text-[11px] font-medium text-accent">
            <FlaskConical className="h-3.5 w-3.5" /> Demo environment — synthetic data only
          </div>
        </div>

        {/* auth card */}
        <form onSubmit={submitPassword} className="nx-glass-2 nx-sheen rounded-3xl border border-line p-6 shadow-[var(--nx-e4)]">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">Staff sign-in</h2>
            <div className="flex rounded-lg border border-line p-0.5" role="tablist" aria-label="Sign-in method">
              <button type="button" role="tab" aria-selected={mode === "password"} onClick={() => { setMode("password"); setError(null); }}
                className={cn("rounded-md px-2.5 py-1 text-[11px] font-medium transition", mode === "password" ? "bg-accent-soft text-ink" : "text-ink-3 hover:text-ink-2")}>
                Email
              </button>
              <button type="button" role="tab" aria-selected={mode === "pin"} onClick={() => { setMode("pin"); setError(null); setMfaRequired(null); }}
                className={cn("rounded-md px-2.5 py-1 text-[11px] font-medium transition", mode === "pin" ? "bg-accent-soft text-ink" : "text-ink-3 hover:text-ink-2")}>
                Staff code
              </button>
            </div>
          </div>

          {mode === "password" ? (
            <>
              <label htmlFor="nx-email" className="mt-5 block text-[11px] font-medium uppercase tracking-wider text-ink-3">Email</label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
                <input
                  id="nx-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-line-2 bg-inset py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink-4 focus:border-accent-line"
                  placeholder="you@hospital.health" autoComplete="email" required
                />
              </div>
              <label htmlFor="nx-pw" className="mt-3.5 block text-[11px] font-medium uppercase tracking-wider text-ink-3">Password</label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
                <input
                  id="nx-pw" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-line-2 bg-inset py-2.5 pl-9 pr-10 text-sm text-ink outline-none transition focus:border-accent-line"
                  placeholder="••••••••••" autoComplete="current-password" required
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-4 transition hover:text-ink-2">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11.5px]">
                <label className="flex cursor-pointer items-center gap-1.5 text-ink-3">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--nx-accent)]" />
                  Remember this device
                </label>
                <button type="button" onClick={forgotPassword} className="text-accent transition hover:underline">Forgot password?</button>
              </div>
            </>
          ) : (
            <>
              <label htmlFor="nx-code" className="mt-5 block text-[11px] font-medium uppercase tracking-wider text-ink-3">Staff code</label>
              <input
                id="nx-code" value={code} onChange={(e) => setCode(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line-2 bg-inset px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-4 focus:border-accent-line"
                placeholder="e.g. DR.RAJESH" autoComplete="username"
              />
              <label htmlFor="nx-pin" className="mt-3.5 block text-[11px] font-medium uppercase tracking-wider text-ink-3">PIN</label>
              <input
                id="nx-pin" value={pin} onChange={(e) => setPin(e.target.value)} type="password" inputMode="numeric"
                className="mt-1.5 w-full rounded-xl border border-line-2 bg-inset px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent-line"
                placeholder="••••" autoComplete="current-password"
              />
            </>
          )}

          {mfaRequired && (
            <div className="mt-4 rounded-xl border border-accent-line bg-accent-soft p-3">
              <label htmlFor="nx-mfa" className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-2">
                <KeyRound className="h-3.5 w-3.5" /> Authenticator code
              </label>
              <input
                id="nx-mfa" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} inputMode="numeric"
                className="mt-1.5 w-full rounded-lg border border-line-2 bg-inset px-3 py-2 text-center font-mono text-lg tracking-[0.3em] text-ink outline-none focus:border-accent-line"
                placeholder="000000" maxLength={6} autoFocus
              />
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3.5 rounded-xl border border-crit-line bg-crit-soft px-3 py-2 text-xs text-crit">{error}</p>
          )}
          {notice && !error && (
            <p role="status" className="mt-3.5 rounded-xl border border-accent-line bg-accent-soft px-3 py-2 text-xs text-ink-2">{notice}</p>
          )}

          <button
            type="submit" disabled={busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink shadow-[var(--nx-e2)] transition hover:bg-accent-2 active:scale-[0.99] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Signing in…" : mfaRequired ? "Verify & sign in" : "Sign in to Hospital OS"}
          </button>

          <button
            type="button" onClick={() => { setShowDemo((v) => !v); setNotice(null); }}
            aria-expanded={showDemo}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-inset px-4 py-2 text-[12.5px] font-medium text-ink-2 transition hover:border-line-2"
          >
            <FlaskConical className="h-3.5 w-3.5" /> {showDemo ? "Hide demo roles" : "Explore demo roles"}
          </button>

          {showDemo && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-4">Demo identities · fills the form, you press Sign in</p>
              <div className="nx-scroll mt-2.5 grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.code} type="button" onClick={() => pickDemo(a)}
                    title={a.desc} aria-pressed={email === a.email}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left transition",
                      email === a.email && mode === "password"
                        ? "border-accent-line bg-accent-soft"
                        : "border-line bg-inset hover:border-line-2"
                    )}
                  >
                    <p className="truncate text-[12px] font-medium text-ink">{a.role}</p>
                    <p className="truncate text-[10px] text-ink-3">{a.desc}</p>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-ink-4">
                Every role sees a different OS. Demo sign-ins use the same audited auth flow as production — nothing is bypassed. Legacy fast path: staff code + PIN 2468.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
