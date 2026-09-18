# Nexura OS — System Architecture

## Overview

Nexura OS is a unified, AI-native healthcare platform built on Next.js 16 with a monolithic
frontend and modular backend. The system is designed for Indian healthcare — high-volume,
multi-tenant, compliance-first, and AI-powered.

## Tech Stack

| Layer         | Technology                                                     | Rationale                                                           |
| ------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router)                                        | SSR + ISR + API routes in one framework. Turbopack for fast dev.    |
| Language      | TypeScript 5 (strict)                                          | Type safety across frontend + backend. No `any` in production code. |
| Database      | Prisma ORM + SQLite (dev) / PostgreSQL (prod)                  | Type-safe DB access. Prisma migrate for versioned schema.           |
| Styling       | Tailwind CSS 4 + shadcn/ui                                     | Utility-first + accessible component library. New York style.       |
| AI            | z-ai-web-dev-sdk (GLM-4-Plus LLM + VLM + ASR)                  | Indian-optimized AI. Backend-only (never client-side).              |
| Auth          | JWT + httpOnly cookies (portal) / localStorage role (hospital) | Stateless + secure.                                                 |
| Real-time     | Polling (30s/60s intervals)                                    | Simpler than WebSockets for MVP. WS planned for v2.                 |
| Charts        | Recharts                                                       | React-native charting. Lightweight.                                 |
| Animations    | Framer Motion                                                  | Declarative animations. Page transitions.                           |
| Notifications | Sonner                                                         | Toast notifications.                                                |
| Deployment    | Vercel (planned)                                               | Edge network + automatic SSL.                                       |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│
│  │ Hospital │ │  Clinic  │ │Pharmacia │ │ Portal   │ │Connect  ││
│  │   OS     │ │   OS     │ │   POS    │ │ Patient  │ │  Chat   ││
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘│
│       │            │            │            │           │      │
│  ┌────┴────────────┴────────────┴────────────┴───────────┴────┐│
│  │              Command Palette (⌘K) + Shared Components       ││
│  └─────────────────────────┬───────────────────────────────────┘│
└────────────────────────────┼────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────┼────────────────────────────────────┐
│                    NEXT.JS API ROUTES                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│
│  │/api/     │ │/api/     │ │/api/     │ │/api/     │ │/api/   ││
│  │hospital  │ │clinic    │ │pharmacy  │ │portal    │ │connect ││
│  │(38 routes)│ │(8 routes)│ │(12 routes)│ │(5 routes)│ │(6)    ││
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘│
│       │            │            │            │           │      │
│  ┌────┴────────────┴────────────┴────────────┴───────────┴────┐│
│  │           AI Layer (z-ai-web-dev-sdk)                       ││
│  │  • GLM-4-Plus LLM (clinical assistant, lab interpretation)  ││
│  │  • VLM (prescription OCR, X-ray reader, derma scan)         ││
│  │  • ASR (voice-to-SOAP, voice billing)                       ││
│  └─────────────────────────┬───────────────────────────────────┘│
└────────────────────────────┼────────────────────────────────────┘
                             │ Prisma ORM
┌────────────────────────────┼────────────────────────────────────┐
│                    DATABASE (Prisma)                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│
│  │ Hospital │ │  Clinic  │ │ Pharmacy │ │  Portal  │ │Connect ││
│  │ (15 models)│ │(6 models)│ │(11 models)│ │(3 models)│ │(4)    ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘│
│                        SQLite (dev) / PostgreSQL (prod)          │
└──────────────────────────────────────────────────────────────────┘
```

## Product Architecture

### Hospital OS (`/hospital`)

- **31 modules** dynamically imported (code-split per module)
- **38 API routes** with Prisma queries
- Auth: Role-based (Doctor, Nurse, Admin, Receptionist, Lab, Pharmacist, Patient)
- Auto-refresh: 30s polling on all dashboards
- AI: Clinical assistant (GLM-4-Plus) + lab interpretation

### Clinic OS (`/clinic`)

- **6 tabs**: Today, Patients, Appointments, Prescriptions, Billing, Reports
- SOAP consultation with drug autocomplete (54 Indian medicines)
- ABHA registry integration
- Public booking page at `/clinic/book/[slug]`

### Pharmacia (`/pharmacy`)

- **8 modules**: Billing, Inventory, Purchases, Suppliers, Customers, Schedule H, Reports, Settings
- Voice billing (Web Speech API, en-IN)
- Prescription OCR (VLM)
- GST e-invoice generation (IRN-ready JSON)
- Schedule H register (CDSCO compliance)

### Patient Portal (`/portal`)

- Phone + OTP login (httpOnly cookie session)
- 5 tabs: Overview, Blood Checkup, Records, Timeline, Family
- Blood Checkup at Home: phlebotomist assignment + 6-step status tracker
- AI lab report interpretation (GLM-4-Plus)
- Family member management

### Connect (`/connect`)

- Doctor-patient chat, voice, video
- Auto-connect when consultations complete or symptom triage flags urgency
- Prescription sync to Pharmacia

### Know Your Health (`/know-your-health`)

- 15 AI tools: symptom checker, derma scan, X-ray reader, diet planner, lab analyzer, etc.
- All powered by z-ai-web-dev-sdk (LLM + VLM)

## Data Model

62 Prisma models across 5 product domains:

- **Hospital** (15): Hospital, Patient, Doctor, Staff, Ward, Bed, Appointment, Admission, Vital, Order, Medicine, Prescription, Bill, InsuranceClaim, OTSurgery
- **Clinic** (6): Clinic, Doctor, Patient, Appointment, Visit, Rx, Invoice
- **Pharmacy** (11): Company, Branch, Staff, Customer, Supplier, Product, Batch, Sale, SaleItem, Purchase, PurchaseItem
- **Portal** (3): PortalUser, BloodBooking, Phlebotomist
- **Connect** (4): Connection, Message, Call, Queue

## Security

- AES-256 encryption at rest (DB)
- TLS 1.3 in transit (HTTPS)
- httpOnly cookies for session
- Role-based access control (RBAC)
- Audit trail (planned)
- Rate limiting (planned)
- DPDP 2023 compliant consent flow

## Scaling Strategy

1. **Phase 1 (current)**: SQLite for dev. Monolithic Next.js. Polling for real-time.
2. **Phase 2 (Q2 2026)**: Migrate to PostgreSQL. Add Redis for caching. WebSocket for real-time.
3. **Phase 3 (Q4 2026)**: Microservices for AI + billing. Read replicas. CDN for static assets.
4. **Phase 4 (Q1 2027)**: Multi-region. Kubernetes. Event-driven architecture (Kafka).

## Observability (planned)

- Sentry for error tracking
- Datadog for APM + logs
- Custom health check endpoint (`/api/health`)
- Structured logging (JSON)
- Metrics: request latency, error rate, DB query time
