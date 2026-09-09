# Nexura OS — Healthcare Operating System

India's first unified, AI-native healthcare platform. 7 products, 20+ AI features, 62 database models, 50+ API routes.

Built by **Arpit Nayan** — a student from Bihar, India.

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env: set DATABASE_URL and JWT_SECRET

# Push database schema
bunx prisma db push

# Seed demo data
bunx tsx scripts/seed-hospital.ts
bunx tsx scripts/seed-clinic.ts
bunx tsx scripts/seed-pharmacy.ts
bunx tsx scripts/seed-portal.ts
bunx tsx scripts/seed-connect.ts

# Start development server
bun run dev

# Open http://localhost:3000
```

## Products

| Product | Route | Description |
|---------|-------|-------------|
| Hospital OS | `/hospital` | 18-module hospital management system |
| Clinic OS | `/clinic` | HealthPlix-style EMR for clinics |
| Pharmacia | `/pharmacy` | AI-powered pharmacy POS |
| Patient Portal | `/portal` | Unified health records + blood test at home |
| Connect | `/connect` | Doctor-patient chat, voice, video |
| Know Your Health | `/know-your-health` | 15 AI health tools |
| Global | `/global` | Medical tourism platform |

Additional pages: `/investors`, `/pricing`, `/compliance`, `/founder`

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5 (strict)
- **Database:** Prisma ORM + SQLite (dev) / PostgreSQL (prod)
- **AI:** z-ai-web-dev-sdk (GLM-4-Plus LLM, VLM, ASR, TTS)
- **Auth:** JWT + bcrypt + httpOnly cookies
- **UI:** Tailwind CSS 4 + shadcn/ui + Framer Motion + Recharts
- **Fonts:** Fraunces (serif) + Plus Jakarta Sans (body)

## Architecture

Nexura OS uses Next.js App Router — frontend and API routes in a single project. This is the recommended Next.js architecture and deploys as a single unit to Vercel.

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # 113 API routes (backend)
│   │   ├── hospital/       # 40 hospital API routes
│   │   ├── clinic/         # 19 clinic API routes
│   │   ├── pharmacy/       # 20 pharmacy API routes
│   │   ├── portal/         # 5 portal API routes
│   │   ├── connect/        # 6 connect API routes
│   │   ├── know-your-health/ # 15 AI tool API routes
│   │   ├── auth/           # JWT authentication
│   │   └── health/         # Health check endpoint
│   ├── hospital/           # Hospital OS page
│   ├── clinic/             # Clinic OS page
│   ├── pharmacy/           # Pharmacy page
│   ├── portal/             # Patient Portal pages
│   ├── ...                 # Other product pages
│   ├── layout.tsx          # Root layout
│   ├── error.tsx           # Route error boundary
│   └── global-error.tsx    # Root error boundary
├── components/             # React components (198 files)
│   ├── hospital/           # Hospital modules (27 files)
│   ├── clinic/             # Clinic components
│   ├── pharmacy/           # Pharmacy components
│   ├── portal/             # Portal components
│   ├── site/               # Shared site components
│   ├── investors/          # Investor/pricing/compliance pages
│   └── ui/                 # shadcn/ui base components
├── lib/                    # Shared libraries
│   ├── ai/                 # NexuraAI Gateway
│   │   └── gateway.ts      # AI abstraction layer
│   ├── auth/               # JWT + security middleware
│   ├── db.ts               # Prisma client
│   └── ...                 # Context libraries
└── ...
```

## AI Gateway

All AI calls go through `src/lib/ai/gateway.ts` (NexuraAI Gateway):

```
Nexura Feature → NexuraAI Gateway → Capability Router → Model Selector → AI Provider → Response
```

**Capabilities:** medical_reasoning, general_ai, vision, speech_to_text, text_to_speech, classification, summarization, agentic_tasks

**Features:** model selection, fallback models, timeout handling, error handling, logging, cost tracking

## Database

62 Prisma models across 8 domains:
- Hospital (15 models)
- Clinic (6 models)
- Pharmacy (11 models)
- Portal (3 models)
- Connect (4 models)
- Indian Drug DB (1 model, 54 medicines)
- Compliance (5 models)
- Blood Bank (1 model)

## Security

- JWT access tokens (15 min) + refresh tokens (30 days)
- bcrypt password hashing (12 rounds)
- Rate limiting (100 req / 15 min per IP)
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- OTP authentication (6-digit, 5-min expiry, max 5 attempts)
- Role-based access control (RBAC)

## Compliance

ABDM · DPDP 2023 · NABH · CDSCO · IRDAI · GST e-Invoice · ICD-10

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel deployment instructions.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture
- [CODEBASE_AUDIT.md](./CODEBASE_AUDIT.md) — Full codebase audit
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Deployment guide
- [PITCH.md](./PITCH.md) — Investor pitch
- [BUSINESS.md](./BUSINESS.md) — Business model
- [ROADMAP.md](./ROADMAP.md) — Product roadmap
- [COMPLIANCE.md](./COMPLIANCE.md) — Regulatory compliance

## Contact

**Arpit Nayan** — Founder & CEO
📧 arpit.nexuraos@gmail.com
📍 Bihar, India 🇮🇳

## License

Proprietary. © 2026 Nexura AI Technologies Pvt. Ltd.
