"use client";

/* ============================================================
 * NEXURA DIY — SHARED CONSENT BOTTOM SHEET
 * The granular per-scope consent pattern (same design language
 * as the onboarding sheets), reusable by any surface that hits
 * a CONSENT_REQUIRED wall mid-flow — e.g. Today's first
 * done/skip or a check-in before PROGRESS_TRACKING was granted.
 * ============================================================ */

export interface ConsentSheetSpec {
  title: string;
  body: string;
  scope: string;
  onAllow: () => void | Promise<void>;
}

export function ConsentSheet({
  sheet,
  onClose,
}: {
  sheet: ConsentSheetSpec | null;
  onClose: () => void;
}) {
  if (!sheet) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Consent"
    >
      <button
        aria-label="Close consent sheet"
        onClick={onClose}
        className="absolute inset-0 bg-[#2E2A26]/45 backdrop-blur-[2px]"
      />
      <div className="nx-glass-deep relative mx-4 mb-6 w-full max-w-md rounded-3xl p-6 pb-8">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D9C8AC]" aria-hidden />
        <h2 className="text-lg font-semibold text-[#2E2A26]">{sheet.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#6B5D4E]">{sheet.body}</p>
        <ul className="mt-3 space-y-1 text-xs text-[#6B5D4E]">
          <li>
            • Scope requested now: <strong>{sheet.scope.replace(/_/g, " ").toLowerCase()}</strong>
          </li>
          <li>• Policy version 2026-09-diy-1 · granular, never bundled</li>
        </ul>
        <div className="mt-5 flex gap-2.5">
          <button
            onClick={async () => {
              const fn = sheet.onAllow;
              onClose();
              await fn();
            }}
            className="diy-btn-primary flex-1 text-sm"
          >
            {sheet.title}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-[#E0D0B8] px-4 py-3 text-sm font-medium text-[#6B5D4E] hover:bg-[#F7EEDD]"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
