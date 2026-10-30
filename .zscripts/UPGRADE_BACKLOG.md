# Nexura-OS — 10x Upgrade Backlog (autonomous cron loop)

Maintained by the 30-minute upgrade cron (job 488305). One substantial item
per run. Rules: additive only — NEVER remove a feature or a design. Verify
(bun run typecheck + route probes) before committing `10x(<area>): ...`.
NEVER push; NEVER commit .env or secrets.

## Priority queue

1. [ ] **KYH offline answers — UI badge** — backend now always answers via
       `src/lib/kyh/offline-engine.ts` (source:"nexura-offline-guide"); add a
       subtle "Offline guide" badge in `src/components/know-your-health/tools/*.tsx`
       result headers when `result.source === "nexura-offline-guide"`.
2. [ ] **Verify standalone boot survives sandbox restarts** — direct
       `setsid nohup node .next/standalone/server.js` (env from .env) is the
       reliable path; dev.sh's bun install now skips when node_modules healthy.
3. [ ] **Rate-limit login endpoint** — /api/nx/auth has no per-IP rate limit;
       add one (10/5min/IP) with clear 429 bodies.
4. [ ] **Structured request logging** — add a request-id + latency log line
       for /api/nx/* routes via a small wrapper (src/lib/nx/api.ts).
5. [ ] **KYH vision tools graceful AI-status hint** — surface "AI vision
       temporarily unavailable" state in derma/food/xray UI on offline fallback.
6. [ ] **PWA offline shell** — pwa-register.tsx exists; add an offline
       fallback page + manifest polish.
7. [ ] **Accessibility sweep** — audit landmarks/aria on the top 6 marketing
       pages; fix focus traps in dialogs.
8. [ ] **DB indexes** — review hot Prisma queries (patients, tasks, orders,
       messages) and add @@index for the filter columns used in handlers.
9. [ ] **README** — add a "Deployment" section documenting the Vercel
       zero-config demo boot + the env-var matrix (DATABASE_URL, JWT_SECRET,
       REDIS_URL, DEMO_MODE, OPENROUTER_API_KEY) and the KYH offline fallback.
10. [ ] **Tests** — vitest unit tests for offline-engine functions
        (triage urgency, BP bands, PHQ-9/GAD-7 banding, lab grading).

## Completed (do not repeat)

- [x] 2026-10-31 — KYH offline engine (15 tools always answer; no more bare
      500s when AI providers are unavailable) + /api/nx catalog + dev.sh
      bun-install guard.
