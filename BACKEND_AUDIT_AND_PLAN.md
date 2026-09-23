# Nexura OS — Backend Architecture Audit & Implementation Plan

## 1. Executive Summary

This document represents the outcome of a comprehensive static analysis of the Nexura OS backend ecosystem. Nexura OS currently operates as a Next.js 16 monolith with modular internal services, heavily relying on Prisma (PostgreSQL) and Redis. The current implementation demonstrates strong foundational patterns (e.g., centralized `withRoute` API wrapper, explicit RBAC, and secure JWT-based auth). The focus of this audit is specifically on completing and fortifying the backend according to the "Professional Backend Engineering Standard" you outlined, prioritizing data integrity, security, and true completion over mocked APIs.

## 2. Existing Backend Architecture

### Request Lifecycle

1.  **Edge Middleware (`src/proxy.ts`)**: Applies request correlation IDs (`x-request-id`), an initial burst rate limit (in-memory bucket, 600 req/min/IP), payload size checks (13MB limit), security headers, and a fast path JWT verification for `DEMO_MODE` gatekeeping.
2.  **Canonical Route Wrapper (`src/lib/nx/api.ts` -> `withRoute`)**: Ensures consistent error handling, injects request IDs into logs, and enforces a distributed Redis-backed rate limit.
3.  **Authentication/Authorization**: Handled primarily through `getSessionFresh` and `requirePermission` (`src/lib/nx/session.ts`). Session revocation and idle-timeout management are backed by Postgres (`NxSessionRecord`).
4.  **Database Layer**: Centralized under `src/lib/nx/db-dialect.ts` and `src/lib/db.ts` to manage PostgreSQL-specific interactive transaction timeouts and replica routing.
5.  **Event Bus (`src/lib/nx/bus.ts`)**: Uses Redis Pub/Sub (`nx:bus`) to fan out real-time Server-Sent Events (SSE) across scaled instances, enforcing tenant isolation and cryptographic HMAC signature validation for security.

### Real-Time & Background Infrastructure

- **SSE**: `src/app/api/nx/stream/route.ts` manages SSE connections, utilizing the Redis event bus.
- **Job Runner**: `src/lib/nx/jobs/runner.ts` implements a durable queue in Postgres using `FOR UPDATE SKIP LOCKED`.

## 3. Findings by Domain

### A. Authentication & Authorization

**Status**: COMPLETE AND FUNCTIONAL (Architecturally)

- **Auth**: Secure JWT generation and HTTP-only cookies (`src/lib/auth/jwt.ts`). Includes strict verification rules that reject mismatched token types (e.g., service vs. refresh).
- **RBAC**: Explicit permission matrix (`src/lib/nx/session.ts`), handling complex delegation and context-scoping (e.g., `patientInScope`).
- **Gap**: OTP delivery is intentionally mocked to `console.log` in development/demo modes. Needs a real Twilio/SNS integration.

### B. AI & Gateway Integrations

**Status**: COMPLETE AND FUNCTIONAL (Architecturally)

- **Gateway**: The legacy API gateway (`src/lib/ai/gateway.ts`) was removed, moving text/vision handling directly to `src/lib/openrouter.ts` and `src/lib/gemini.ts`.
- **Consent & Governance**: Strictly enforced via `aiGate` (`src/lib/nx/ai-guard.ts`) and AI interaction logging in Postgres.

### C. Pharmacy & Billing

**Status**: PARTIALLY IMPLEMENTED (Architecturally complete, but lacking payment capture)

- **Billing Logic**: `src/app/api/pharmacy/billing/route.ts` is robust. It uses an integer-paise math layer, correct GST calculations, and concurrency controls (`$transaction` with conditional stock decrements and P2002 retry).
- **Gap**: The system lacks a real payment integration layer. The UI captures `paymentMode` (upi, cash, card), and the API stores it, but no actual payment is verified or captured via a webhook from a provider (e.g., Razorpay/Stripe).

### D. Clinic & Booking

**Status**: COMPLETE AND FUNCTIONAL

- **Booking**: `src/app/api/clinic/booking/route.ts` safely processes online bookings to appointments with concurrency controls (`updateMany` claim check).

## 4. Prioritized Implementation Roadmap (P0-P3)

The following roadmap strictly aligns with the core backend design principles: Completeness, Security, and Production-Readiness.

### Priority P0: Critical Security & Data Integrity

_No immediate P0 vulnerabilities were identified during the read-only static analysis, as the previous security audit successfully patched major issues (e.g., token leakage, brute force). Concurrency controls are strong._

### Priority P1: Core Functionality (Blocking Frontend Workflows)

1.  **Item 1: Implement Real OTP/SMS Delivery Service**
    - _Problem_: User registration and MFA currently log OTPs to the console, meaning the "complete backend path" for user authentication is technically broken in a production environment.
    - _Required Behavior_: Integrate a real SMS provider (e.g., Twilio) via a clean service abstraction. Keep the console fallback only if `DEMO_MODE=true` is explicitly set.
    - _Files Affected_: `src/lib/mailer.ts`, `src/lib/auth/totp.ts` (or create new `src/lib/sms.ts`), `src/app/api/nx/auth/route.ts`.
2.  **Item 2: Implement Payment Gateway Verification Layer**
    - _Problem_: The Pharmacy billing API (`src/app/api/pharmacy/billing/route.ts`) and Patient Portal booking APIs store `paymentMode` but do not verify capture. This is a critical gap for a healthcare ecosystem processing money.
    - _Required Behavior_: Create a payment service layer (`src/lib/payments.ts`) that exposes intent-creation and webhook-verification functions. The billing APIs must verify successful capture (e.g., via a mocked Razorpay intent if credentials aren't available, but the architecture must be real) before committing the transaction.
    - _Files Affected_: `src/app/api/pharmacy/billing/route.ts`, new `src/lib/payments.ts`, new `src/app/api/nx/webhooks/payments/route.ts`.

### Priority P2: Reliability, Architecture & Testing

1.  **Item 3: File Upload Anti-Virus Hooks (ClamAV)**
    - _Problem_: Pharmacy prescription uploads (`src/app/api/pharmacy/online-orders/route.ts`) are currently validated by size and MIME type, but not scanned for malware.
    - _Required Behavior_: Create a clean interface for file scanning (`src/lib/nx/scanner.ts`) before pushing blobs to Postgres. If ClamAV isn't locally available, fail gracefully or mock the service, but the architecture must exist.

### Priority P3: Optimization & Refactoring

1.  **Item 4: Consolidate Automation Engine Hooks**
    - _Problem_: The event bus (`src/lib/nx/bus.ts`) and the automation engine (`src/lib/nx/automations.ts`) could be more tightly coupled.
    - _Required Behavior_: Refactor the dispatch logic into a unified `emit()` function that handles pub/sub, webhooks, and automation triggers centrally.

---

**ACTION REQUIRED**: Awaiting user approval of this initial Backend Architecture Audit and Roadmap before proceeding with implementation.
