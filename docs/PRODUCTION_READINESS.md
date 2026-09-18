# Production Readiness Checklist

## Code & data (done in this repo)

- [x] RBAC-as-data enforced server-side on every protected route
- [x] Session revocation, lockout, MFA architecture, break-glass
- [x] Signed-note immutability + version history
- [x] Tenant isolation (hospitalId scoping) + patient-context scoping
- [x] Tamper-evident audit chain; view-auditing on patient records
- [x] Idempotency on payments; validated state machines (422 on illegal moves)
- [x] Health/readiness endpoints; structured logs; request IDs
- [x] 39 unit tests + 29-check API smoke + e2e specs; CI pipeline
- [x] Security headers + CSP; secrets out of git; env validation
- [x] Dockerfile (non-root, healthcheck) + compose; OpenAPI served

## Your checklist before go-live

- [ ] Postgres (or managed SQLite w/ volume snapshots) + `prisma migrate deploy`
- [ ] `JWT_SECRET` rotated, ≥32 random chars, stored in a secret manager
- [ ] `DEMO_MODE=false`; demo accounts removed or locked
- [ ] TLS termination + HSTS confirmed at the edge
- [ ] SMTP/provider wired for password reset + verification
- [ ] Real identity provider (SSO/OIDC) if required — adapter point ready
- [ ] Backups: scheduled DB snapshots + tested restore (INCIDENT_RESPONSE.md)
- [ ] Redis-backed rate limiting + SSE pub/sub for multi-replica
- [ ] Background job runner: reminders, webhook dispatcher, retention cron
- [ ] Error tracking (Sentry) wired into `captureError()` (src/lib/logger.ts)
- [ ] Load test the SSE fan-out and analytics endpoints
- [ ] Security review/pen-test; CSP tightened to nonces
- [ ] Compliance work: policies, BAAs/DPAs (incl. AI providers), training, audit sign-off
