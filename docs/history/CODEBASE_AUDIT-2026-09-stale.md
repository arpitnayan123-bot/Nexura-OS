# Nexura OS — Codebase Audit

## Classification Legend

1. REQUIRED — actively used by the application
2. DEPENDENCY — required indirectly
3. DUPLICATE — duplicate implementation (remove)
4. DEAD CODE — never used (remove)
5. DEMO/PLACEHOLDER — not required for production (remove or archive)
6. GENERATED — can be regenerated
7. DOCUMENTATION
8. CONFIGURATION
9. ASSET
10. BACKEND CANDIDATE

---

## Root Directory

| Path                  | Classification | Purpose                                         | Used?    | Action                  |
| --------------------- | -------------- | ----------------------------------------------- | -------- | ----------------------- |
| `src/`                | REQUIRED       | All application source code                     | ✅       | Keep                    |
| `prisma/`             | REQUIRED       | Database schema + migrations                    | ✅       | Keep                    |
| `public/`             | REQUIRED       | Static assets (images, favicon, founder photos) | ✅       | Keep                    |
| `scripts/`            | REQUIRED       | Seed scripts for demo data                      | ✅       | Keep (for dev)          |
| `download/`           | ASSET          | Generated PDFs, videos, screenshots             | Demo     | Keep (deliverables)     |
| `db/`                 | GENERATED      | SQLite database file                            | Dev only | Keep (gitignored)       |
| `node_modules/`       | DEPENDENCY     | NPM packages                                    | ✅       | Keep (gitignored)       |
| `.next/`              | GENERATED      | Build output                                    | Build    | Keep (gitignored)       |
| `examples/`           | DEAD CODE      | Websocket demo (2 files)                        | ❌       | **Remove**              |
| `tests/`              | DEAD CODE      | Shell scripts, not actual tests                 | ❌       | **Remove**              |
| `mini-services/`      | DEAD CODE      | Empty directory                                 | ❌       | **Remove**              |
| `tool-results/`       | DEAD CODE      | Temporary bash output files (26 files)          | ❌       | **Remove** (gitignored) |
| `upload/`             | DEAD CODE      | Original HEIC photo (processed already)         | ❌       | **Remove**              |
| `video-clips-v2/`     | GENERATED      | Video production intermediates                  | ❌       | **Remove** (gitignored) |
| `video-narration/`    | GENERATED      | TTS audio files                                 | ❌       | **Remove**              |
| `video-narration-v2/` | GENERATED      | TTS audio files v2                              | ❌       | **Remove**              |
| `video-recordings/`   | GENERATED      | Video clips                                     | ❌       | **Remove**              |
| `video-screenshots/`  | GENERATED      | Screenshots for video                           | ❌       | **Remove**              |
| `skills/`             | DEMO           | Z.ai skill definitions (1076 files, 61MB)       | ❌       | **Remove** (gitignored) |
| `.zscripts/`          | CONFIGURATION  | Build scripts for sandbox                       | Dev      | Keep                    |

## Root Files

| Path                 | Classification | Purpose                   | Action                |
| -------------------- | -------------- | ------------------------- | --------------------- |
| `package.json`       | CONFIGURATION  | Dependencies              | Keep                  |
| `tsconfig.json`      | CONFIGURATION  | TypeScript config         | Keep                  |
| `next.config.ts`     | CONFIGURATION  | Next.js config            | Keep                  |
| `tailwind.config.ts` | CONFIGURATION  | Tailwind config           | Keep                  |
| `components.json`    | CONFIGURATION  | shadcn/ui config          | Keep                  |
| `.env`               | CONFIGURATION  | Environment variables     | Keep (gitignored)     |
| `.gitignore`         | CONFIGURATION  | Git ignore rules          | Keep                  |
| `ARCHITECTURE.md`    | DOCUMENTATION  | System architecture       | Keep                  |
| `BUSINESS.md`        | DOCUMENTATION  | Business model            | Keep                  |
| `COMPLIANCE.md`      | DOCUMENTATION  | Regulatory compliance     | Keep                  |
| `PITCH.md`           | DOCUMENTATION  | Investor pitch            | Keep                  |
| `ROADMAP.md`         | DOCUMENTATION  | Product roadmap           | Keep                  |
| `worklog.md`         | DOCUMENTATION  | Development history       | Keep                  |
| `next-env.d.ts`      | GENERATED      | Next.js type declarations | Keep (auto-generated) |

## Source Code — `src/`

### Pages (`src/app/`) — 17 pages

| Route                 | Classification | Used? | Action |
| --------------------- | -------------- | ----- | ------ |
| `/` (page.tsx)        | REQUIRED       | ✅    | Keep   |
| `/hospital`           | REQUIRED       | ✅    | Keep   |
| `/clinic`             | REQUIRED       | ✅    | Keep   |
| `/clinic/book/[slug]` | REQUIRED       | ✅    | Keep   |
| `/pharmacy`           | REQUIRED       | ✅    | Keep   |
| `/portal`             | REQUIRED       | ✅    | Keep   |
| `/portal/login`       | REQUIRED       | ✅    | Keep   |
| `/connect`            | REQUIRED       | ✅    | Keep   |
| `/connect/patient`    | REQUIRED       | ✅    | Keep   |
| `/know-your-health`   | REQUIRED       | ✅    | Keep   |
| `/global`             | REQUIRED       | ✅    | Keep   |
| `/global/dashboard`   | REQUIRED       | ✅    | Keep   |
| `/investors`          | REQUIRED       | ✅    | Keep   |
| `/pricing`            | REQUIRED       | ✅    | Keep   |
| `/compliance`         | REQUIRED       | ✅    | Keep   |
| `/founder`            | REQUIRED       | ✅    | Keep   |
| `layout.tsx`          | REQUIRED       | ✅    | Keep   |
| `globals.css`         | REQUIRED       | ✅    | Keep   |
| `error.tsx`           | REQUIRED       | ✅    | Keep   |
| `global-error.tsx`    | REQUIRED       | ✅    | Keep   |

### API Routes (`src/app/api/`) — 113 routes

All API routes are REQUIRED. They serve as the backend for the application.
Classification: BACKEND CANDIDATE (but should remain in Next.js for Vercel deployment).

#### Hospital APIs (40 routes) — All REQUIRED

#### Clinic APIs (19 routes) — All REQUIRED

#### Pharmacy APIs (20 routes) — All REQUIRED

#### Portal APIs (5 routes) — All REQUIRED

#### Connect APIs (6 routes) — All REQUIRED

#### KYH APIs (15 routes) — All REQUIRED

#### Auth API (1 route) — REQUIRED

#### Health API (1 route) — REQUIRED

#### Appointments API (1 route) — REQUIRED

#### Assistant API (1 route) — REQUIRED

#### Health-stats API (1 route) — REQUIRED

#### Global API (1 route) — REQUIRED

#### CDSCOS check, QR verify, NPPA prices, med-sync, auto-refill, risk-score — REQUIRED

### Components (`src/components/`) — 198 files

#### Hospital Components (`src/components/hospital/`)

| File                                | Classification | Used?                    | Action     |
| ----------------------------------- | -------------- | ------------------------ | ---------- |
| `shell.tsx`                         | REQUIRED       | ✅                       | Keep       |
| `hospital-app.tsx`                  | REQUIRED       | ✅                       | Keep       |
| `auth-context.tsx`                  | REQUIRED       | ✅                       | Keep       |
| `login.tsx`                         | REQUIRED       | ✅                       | Keep       |
| `lazy-shell.tsx`                    | REQUIRED       | ✅                       | Keep       |
| `types.ts`                          | REQUIRED       | ✅                       | Keep       |
| `modules/dashboard.tsx`             | REQUIRED       | ✅                       | Keep       |
| `modules/opd.tsx`                   | REQUIRED       | ✅                       | Keep       |
| `modules/ipd.tsx`                   | REQUIRED       | ✅                       | Keep       |
| `modules/nursing.tsx`               | REQUIRED       | ✅                       | Keep       |
| `modules/lab.tsx`                   | REQUIRED       | ✅                       | Keep       |
| `modules/beds.tsx`                  | REQUIRED       | ✅                       | Keep       |
| `modules/ot.tsx`                    | REQUIRED       | ✅                       | Keep       |
| `modules/ehr.tsx`                   | REQUIRED       | ✅                       | Keep       |
| `modules/billing.tsx`               | REQUIRED       | ✅                       | Keep       |
| `modules/insurance.tsx`             | REQUIRED       | ✅                       | Keep       |
| `modules/staff.tsx`                 | REQUIRED       | ✅                       | Keep       |
| `modules/radiology.tsx`             | REQUIRED       | ✅                       | Keep       |
| `modules/blood-bank.tsx`            | REQUIRED       | ✅                       | Keep       |
| `modules/pharmacy-link.tsx`         | REQUIRED       | ✅                       | Keep       |
| `modules/reports.tsx`               | REQUIRED       | ✅                       | Keep       |
| `modules/settings.tsx`              | REQUIRED       | ✅                       | Keep       |
| `modules/ai-command.tsx`            | REQUIRED       | ✅                       | Keep       |
| `modules/ai-scribe.tsx`             | REQUIRED       | ✅                       | Keep       |
| `modules/admin-dashboard.tsx`       | REQUIRED       | ✅                       | Keep       |
| `modules/bedside.tsx`               | DEAD CODE      | ❌ Not imported by shell | **Remove** |
| `modules/discharge-readiness.tsx`   | DEAD CODE      | ❌ Not imported by shell | **Remove** |
| `modules/emar.tsx`                  | DEAD CODE      | ❌ Not imported by shell | **Remove** |
| `modules/appointments.tsx`          | DEAD CODE      | ❌ Not imported by shell | **Remove** |
| `modules/patients.tsx`              | DEAD CODE      | ❌ Not imported by shell | **Remove** |
| `modules/bpa.tsx`                   | REQUIRED       | ✅                       | Keep       |
| `modules/chart-review.tsx`          | REQUIRED       | ✅                       | Keep       |
| `modules/clinical-intelligence.tsx` | REQUIRED       | ✅                       | Keep       |
| `modules/in-basket.tsx`             | REQUIRED       | ✅                       | Keep       |
| `modules/international-desk.tsx`    | REQUIRED       | ✅                       | Keep       |
| `modules/outbreak.tsx`              | REQUIRED       | ✅                       | Keep       |
| `modules/population-health.tsx`     | REQUIRED       | ✅                       | Keep       |
| `modules/ai-orchestration.tsx`      | REQUIRED       | ✅                       | Keep       |
| `modules/storyboard.tsx`            | REQUIRED       | ✅                       | Keep       |
| `patient-portal.tsx`                | REQUIRED       | ✅                       | Keep       |

#### Pharmacy Components

| File                     | Classification | Used?                                    | Action     |
| ------------------------ | -------------- | ---------------------------------------- | ---------- |
| `lazy-pharmacia.tsx`     | REQUIRED       | ✅ Active shell                          | Keep       |
| `pharmacia-app.tsx`      | REQUIRED       | ✅ Active app                            | Keep       |
| `dashboard.tsx`          | REQUIRED       | ✅ Billing screen                        | Keep       |
| `modules3/` (12 files)   | REQUIRED       | ✅ Active modules                        | Keep       |
| `shell2.tsx`             | DUPLICATE      | ❌ Old shell, replaced by lazy-pharmacia | **Remove** |
| `lazy-shell2.tsx`        | DUPLICATE      | ❌ Old lazy loader                       | **Remove** |
| `modules2/` (8 files)    | DUPLICATE      | ❌ Old modules, replaced by modules3/    | **Remove** |
| `credits-footer.tsx`     | REQUIRED       | ✅                                       | Keep       |
| `mic-indicator.tsx`      | REQUIRED       | ✅                                       | Keep       |
| `predict-panel.tsx`      | REQUIRED       | ✅                                       | Keep       |
| `prescription-modal.tsx` | REQUIRED       | ✅                                       | Keep       |
| `pwa-register.tsx`       | REQUIRED       | ✅                                       | Keep       |
| `salt-finder.tsx`        | REQUIRED       | ✅                                       | Keep       |

#### Site Components (`src/components/site/`)

All 34 files are REQUIRED (navbar, hero, features-showcase, founder-story, etc.)

#### Portal Components (`src/components/portal/`)

All 10 files are REQUIRED.

#### Connect Components (`src/components/connect/`)

All files are REQUIRED.

#### KYH Components (`src/components/know-your-health/`)

All files are REQUIRED.

#### Investors Components (`src/components/investors/`)

All 3 files are REQUIRED (investor-deck, pricing-page, compliance-page).

#### Widgets (`src/components/widgets/`)

`health-assistant.tsx` is REQUIRED.

#### UI Components (`src/components/ui/`)

All shadcn/ui components are REQUIRED.

### Lib (`src/lib/`) — 9 files

All REQUIRED: `db.ts`, `utils.ts`, `auth/jwt.ts`, `auth/middleware.ts`, `hospital-context.ts`, `clinic-context.ts`, `pharmacy-context.ts`

### Prisma Schema

`prisma/schema.prisma` — 1387 lines, 62 models. All REQUIRED.

---

## Summary

| Category                        | Count       | Action                      |
| ------------------------------- | ----------- | --------------------------- |
| REQUIRED (keep)                 | ~350 files  | Keep                        |
| DUPLICATE (remove)              | 11 files    | Remove                      |
| DEAD CODE (remove)              | 9 files     | Remove                      |
| DEMO/GENERATED (remove/archive) | ~1100 files | Remove (gitignored already) |
| DOCUMENTATION                   | 7 files     | Keep                        |
| CONFIGURATION                   | 8 files     | Keep                        |

## Files to Remove (Phase 3)

### Duplicate Pharmacy Code (11 files)

- `src/components/pharmacy/shell2.tsx`
- `src/components/pharmacy/lazy-shell2.tsx`
- `src/components/pharmacy/modules2/billing.tsx`
- `src/components/pharmacy/modules2/customers.tsx`
- `src/components/pharmacy/modules2/inventory.tsx`
- `src/components/pharmacy/modules2/purchases.tsx`
- `src/components/pharmacy/modules2/reports.tsx`
- `src/components/pharmacy/modules2/schedule-h.tsx`
- `src/components/pharmacy/modules2/settings.tsx`
- `src/components/pharmacy/modules2/suppliers.tsx`
- `src/components/pharmacy/modules2/` (directory)

### Dead Hospital Modules (5 files)

- `src/components/hospital/modules/bedside.tsx`
- `src/components/hospital/modules/discharge-readiness.tsx`
- `src/components/hospital/modules/emar.tsx`
- `src/components/hospital/modules/appointments.tsx`
- `src/components/hospital/modules/patients.tsx`

### Dead Directories

- `examples/` (websocket demo)
- `tests/` (shell scripts)
- `mini-services/` (empty)
- `upload/` (original HEIC photo)

### Generated/Temporary (safe to remove, already gitignored)

- `video-clips-v2/`
- `video-narration/`
- `video-narration-v2/`
- `video-recordings/`
- `video-screenshots/`
- `tool-results/`
- `skills/`
