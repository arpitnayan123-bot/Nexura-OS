# Testing

## Layers

| Suite            | Command                                                    | Coverage                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit (Vitest)    | `bun run test`                                             | 47 tests: permission-matrix invariants (least privilege, finance/clinical separation, break-glass scope), RFC-6238 TOTP (drift/encoding/otpauth), pagination edge cases, CSV escaping, rate limiting, event-bus tenant isolation/audience/ordering, SSE channel privacy + connection caps + epoch-seq monotonicity, service-token scope enforcement + tamper/expiry rejection, secure-by-default env posture (DEMO_MODE off, prod JWT fail-fast) |
| API smoke (bash) | `bun run test:api` (dev server up)                         | 30 end-to-end checks: both auth paths, preview embeddability (no XFO deny + frame-ancestors), lockout, session, patient privacy scoping (403), task lifecycle + illegal-transition guard, note immutability (sign→edit 423→addendum), RBAC denials per role, billing separation, idempotent payment replay, SSE hello, validation errors, security headers                                                                                       |
| E2E (Playwright) | `bunx playwright install chromium && bunx playwright test` | 8 role journeys incl. the mandated scenarios (sign-in per role, patient record, task, message, beds, scheduling, unauthorized action, sign-out revocation)                                                                                                                                                                                                                                                                                       |
| CI               | GitHub Actions                                             | prisma validate/generate → tsc src gate → lint → unit → db push + seed → boot + API smoke → secret scan (.env not committed)                                                                                                                                                                                                                                                                                                                     |

## The 12 mandated scenarios → where they live

1–3 (sign-in per role), 4 (patient record), 5 (task), 6 (message), 7 (bed),
8 (appointment), 10 (unauthorized), 12 (sign-out/revocation): `tests/e2e/hospital-os.spec.ts`

- API smoke. 9 (lab result): API smoke covers verify/critical escalation endpoints;
  11 (audit event): audit chain endpoints + immutability tests.

## Conventions

- Unit tests are pure-function fast (no DB) — run on every save.
- API smoke is a bash script so it doubles as executable documentation.
- E2E uses demo emails only; no real PHI anywhere in fixtures (mandate).
