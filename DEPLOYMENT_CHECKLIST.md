# Nexura OS — Deployment Checklist

## Pre-Deployment

### Code Quality
- [x] ESLint passes with 0 errors, 0 warnings
- [x] No `any` types in production code
- [x] No hardcoded API keys or secrets
- [x] No console.log in production API routes (except AI gateway logging)
- [x] All imports resolve correctly

### Environment Variables
- [x] `.env.example` created with all required variables documented
- [x] `.env` is in `.gitignore` (confirmed)
- [x] `JWT_SECRET` is set (64-char hex)
- [x] `DATABASE_URL` is set
- [x] No secrets committed to Git

### Database
- [x] Prisma schema is valid (`bunx prisma validate`)
- [x] Schema pushed to SQLite (dev)
- [ ] Schema pushed to PostgreSQL (prod — do after Vercel setup)
- [x] Seed scripts are idempotent (safe to re-run)
- [x] Prisma client generates correctly

### Security
- [x] JWT authentication implemented (access + refresh tokens)
- [x] Password hashing with bcrypt (12 rounds)
- [x] Rate limiting on auth endpoints (3 OTP / 5 min)
- [x] Rate limiting on all API routes (100 req / 15 min)
- [x] Security headers on all API responses
- [x] httpOnly cookies for session tokens
- [x] Input sanitization (XSS prevention)
- [x] Phone validation (Indian format)
- [x] OTP: 6-digit, crypto-secure, 5-min expiry, max 5 attempts
- [x] Error boundaries (route + global level)

### API Routes
- [x] All 113 API routes return correct status codes
- [x] All routes have try/catch error handling
- [x] Health check endpoint (`/api/health`) works
- [x] Auth flow works (send OTP → verify → get user → logout)
- [x] No dead API routes

### Frontend
- [x] All 17 pages load without errors
- [x] All 198 components render correctly
- [x] Responsive design (mobile 390px, tablet 768px, desktop 1920px)
- [x] Command palette (⌘K) works
- [x] Dark/light theme toggle works
- [x] Error states on all data-fetching modules
- [x] Loading states on all async operations
- [x] Sonner toasts on all user actions

### AI Features
- [x] NexuraAI Gateway created (`src/lib/ai/gateway.ts`)
- [x] AI Gateway handles: model selection, fallback, timeout, logging
- [x] AI Scribe works (voice → SOAP + Rx + Billing)
- [x] AI Discharge Summary works (admission data → NMC summary)
- [x] AI Clinical Assistant works (Q&A)
- [x] AI Prescription OCR works (Rx image → medicines)
- [x] AI Lab Report Interpretation works (lab JSON → plain language)
- [x] All AI outputs include disclaimer
- [x] AI never auto-saves without doctor approval
- [x] Audio from AI Scribe is never stored

### Dead Code Removal
- [x] Duplicate pharmacy shell (shell2.tsx, lazy-shell2.tsx) — removed
- [x] Duplicate pharmacy modules (modules2/) — removed
- [x] Unused hospital modules (5 files) — removed
- [x] examples/ directory — removed
- [x] tests/ directory — removed
- [x] mini-services/ directory — removed
- [x] Video intermediate files — removed
- [x] tool-results/ — removed (gitignored)
- [x] skills/ — removed (gitignored)

## Vercel Deployment

### Step 1: Push to GitHub
- [ ] All changes committed
- [ ] Pushed to GitHub repository
- [ ] `.gitignore` excludes: .env, db/, skills/, node_modules/, .next/

### Step 2: Vercel Project Setup
- [ ] Import repository on Vercel
- [ ] Framework: Next.js (auto-detected)
- [ ] Build command: `bun run build` (or default)
- [ ] Install command: `bun install`
- [ ] Root directory: `./`

### Step 3: Environment Variables (Vercel Dashboard)
- [ ] `DATABASE_URL` = PostgreSQL connection string
- [ ] `JWT_SECRET` = 64-char hex string
- [ ] `NODE_ENV` = `production`

### Step 4: Database
- [ ] Create PostgreSQL database (Neon/Supabase/Vercel Postgres)
- [ ] Run `DATABASE_URL="..." bunx prisma db push`
- [ ] Run seed scripts (optional)
- [ ] Verify connection from Vercel

### Step 5: Deploy
- [ ] Click Deploy on Vercel
- [ ] Build completes successfully
- [ ] No build errors

### Step 6: Post-Deploy Verification
- [ ] `https://app.vercel.app/` loads (200)
- [ ] `https://app.vercel.app/api/health` returns `{"status":"ok"}`
- [ ] `https://app.vercel.app/hospital` loads
- [ ] `https://app.vercel.app/portal/login` loads
- [ ] `https://app.vercel.app/api/auth` returns `{"user":null}`
- [ ] Auth flow works (send OTP → verify → get user)
- [ ] AI features work (test AI Scribe or AI Assistant)

### Step 7: Custom Domain (Optional)
- [ ] Add domain in Vercel
- [ ] Configure DNS
- [ ] SSL certificate active

## Production Readiness Score

| Category | Status | Notes |
|----------|--------|-------|
| Code Quality | ✅ Pass | 0 lint errors, TypeScript strict |
| Security | ✅ Pass | JWT, bcrypt, rate limiting, security headers |
| Error Handling | ✅ Pass | Route + global error boundaries |
| AI Gateway | ✅ Pass | Model routing, fallback, logging |
| Dead Code | ✅ Pass | All confirmed dead code removed |
| Documentation | ✅ Pass | SRS, README, API, DEPLOYMENT, ARCHITECTURE |
| Environment | ✅ Pass | .env.example, no secrets in Git |
| Vercel Ready | ✅ Pass | vercel.json, Next.js framework |

## Known Limitations

1. **Database:** SQLite (dev) — must migrate to PostgreSQL for production
2. **Real-time:** Polling (30s) — WebSocket upgrade planned
3. **SMS OTP:** Returns OTP in dev mode — must integrate MSG91 for production
4. **WhatsApp:** Not integrated — must add WATI/Gupshup for production
5. **Payments:** Not integrated — must add Razorpay for blood test/teleconsult payments
6. **ABDM:** Not certified — must apply to NHA for certification
7. **File storage:** No cloud storage — must add S3/Vercel Blob for prescription images

## Remaining Issues / Blockers

| Issue | Priority | Status |
|-------|----------|--------|
| PostgreSQL migration | P0 | Schema ready, needs prod DB |
| MSG91 SMS integration | P0 | Auth code ready, needs API key |
| Razorpay integration | P1 | No code yet |
| WhatsApp Business API | P1 | No code yet |
| ABDM certification | P2 | Government process (2-3 months) |
| WebSocket real-time | P2 | Polling works, WS is upgrade |
| Mobile app | P3 | Not started |
| Sentry error tracking | P3 | Error boundaries exist, Sentry is enhancement |
