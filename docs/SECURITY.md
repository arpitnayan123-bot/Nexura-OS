# Security & Privacy Notes

## Implemented controls

**Authentication & sessions**

- bcrypt (cost 12) password hashing; PINs hashed too
- HttpOnly, SameSite=Lax, Secure-in-prod session cookies; JWT with jti
- Server-side session records → instant revocation (per-device or all)
- Progressive account lockout + per-IP login rate limiting
- TOTP MFA (RFC-6238, self-implemented, ±1 step tolerance)

**Authorization**

- RBAC-as-data: 20 roles → 36 permissions; deny-overrides via explicit grants
- Enforcement on every protected route (`requirePermission` / `guard`) — no
  frontend-only checks for anything that matters
- Tenant isolation: every query is hospital-scoped; cross-hospital access → 403
- Patient-context scoping: patient-role accounts hard-locked to `linkedPatientId`
- Break-glass with mandatory reason + TTL + full audit trail

**Data protection**

- Prisma parameterized queries (no string SQL from user input)
- zod validation on request bodies; typed route handlers
- No patient data in URLs (records referenced by opaque cuid); no PHI in logs —
  log calls pass ids/counts only
- Signed clinical notes are immutable (server-enforced 423); full version history
- Tamper-evident audit chain (SHA-256 linked hashes per hospital)
- Payment writes are idempotency-key protected
- Security headers via `src/proxy.ts`: nosniff, referrer policy, permissions
  policy, HSTS (prod), CSP (enforced in prod, report-only in dev).
  Framing is deliberately permissive (dev: any ancestor, prod: same-origin +
  https gateways) so the platform preview can embed the app — document any
  change to this trade-off here.

**Network**

- Encryption in transit is a hosting responsibility: terminate TLS at your
  edge/load balancer (Caddy/Nginx/ALB) and keep HSTS on.

## Explicitly NOT done (your responsibility)

- No formal compliance certification (HIPAA/ABDM/GDPR). Technical foundation only.
- Encryption at rest depends on the hosting layer (use encrypted volumes; for
  Postgres enable pgcrypto/TDE as appropriate). SQLite file is NOT encrypted.
- No field-level encryption for sensitive columns (integration point).
- Email transport is console-logged in demo — wire SMTP/provider before real users.
- Malware scanning for uploads: `NxFileObject.scanStatus` is an integration point
  (currently `skipped`); wire ClamAV or a scanning service.
- CSP ships report-only in dev and permissive-script in prod; tighten after
  frontend audit (no inline script needs remain).
- Rate limiting is in-memory per process — use a shared store (Redis) for
  multi-replica deployments.
- The AI features call model providers — ensure your BAAs/DPAs cover them and
  PHI is minimized before enabling in production.

See also: KNOWN_LIMITATIONS.md, INCIDENT_RESPONSE.md.
