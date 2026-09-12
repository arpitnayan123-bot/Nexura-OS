"use client";

/* ============================================================
 * NEXURA DIY — APP SHELL
 * Boots a silent identity (portal session or guest), then
 * renders the four surfaces. ORDER IS THE PRODUCT: opening
 * DIY lands on "New goals" (the chat) FIRST — Today, Skin,
 * Settings follow. 56px bottom nav on every surface.
 * ============================================================ */

import { useCallback, useEffect, useState } from "react";
import { MessageSquareText, Home, Sparkles, Settings2 } from "lucide-react";
import { Onboarding } from "./onboarding";
import { Dashboard } from "./dashboard";
import { Skincare } from "./skincare";
import { SettingsView } from "./settings";
import { diyFetch } from "./client-types";

export type DiyView = "onboarding" | "dashboard" | "skin" | "settings";

const NAV: { key: DiyView; label: string; icon: typeof Home }[] = [
  { key: "onboarding", label: "New goals", icon: MessageSquareText },
  { key: "dashboard", label: "Today", icon: Home },
  { key: "skin", label: "Skin", icon: Sparkles },
  { key: "settings", label: "Settings", icon: Settings2 },
];

export function DiyApp() {
  const [view, setView] = useState<DiyView>("onboarding");
  const [booted, setBooted] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  /* silent identity boot: never blocks the chat UI with a sign-in wall */
  const boot = useCallback(async () => {
    try {
      const s = await diyFetch<{ mode: string }>("/api/diy/session", { method: "POST", body: "{}" });
      if (s.mode === "none") throw new Error("identity failed");
      setBooted(true);
    } catch {
      setBootError("We could not start your session. Please check your connection and refresh.");
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  const onDone = useCallback(() => setView("dashboard"), []);

  return (
    <div className="nx-diy relative min-h-screen bg-[#F7EFE3] text-[#2E2A26]" style={{ paddingBottom: 0 }}>
      {bootError ? (
        <div className="mx-auto max-w-md px-6 pt-24 text-center">
          <p className="mb-3 text-base font-medium">{bootError}</p>
          <button onClick={boot} className="diy-btn-primary text-sm">
            Try again
          </button>
        </div>
      ) : view === "onboarding" ? (
        <Onboarding booted={booted} onDone={onDone} />
      ) : view === "dashboard" ? (
        <Dashboard onNewGoals={() => setView("onboarding")} />
      ) : view === "skin" ? (
        <Skincare />
      ) : (
        <SettingsView />
      )}

      {/* bottom nav — 56px, New goals FIRST */}
      <nav
        aria-label="DIY sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E7D9C4]/70 bg-[#FBF5EA]/92 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {NAV.map(({ key, label, icon: Icon }) => {
            const active = view === key;
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                aria-current={active ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  active ? "text-[#B05A34]" : "text-[#8A7A66] hover:text-[#2E2A26]"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
