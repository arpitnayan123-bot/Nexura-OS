# Security policy

Nexura OS handles health-adjacent data models, consent ledgers and money math — security reports are taken seriously and acted on quickly.

## Supported versions

| Version | Supported |
|---------|-----------|
| `main` (latest release) | ✅ |
| older tags | ❌ — upgrade |

## Reporting a vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Use GitHub's private vulnerability reporting:
**https://github.com/arpitnayan123-bot/Nexura-OS/security/advisories/new**

If unavailable, contact [@arpitnayan123-bot](https://github.com/arpitnayan123-bot) directly.

Please include: affected component/route, reproduction steps or PoC, and your assessment of impact. You will get an acknowledgement within 72 hours, and a fix-or-mitigation plan within 14 days for confirmed issues.

## Scope notes

In scope: auth/session flows, RBAC/ABAC bypasses, consent-revocation bypass, idempotency/money-integrity issues, injection, SSRF, rate-limit bypass, audit-trail tampering, gateway key handling.

Out of scope (this is a self-hostable open-source platform): misconfigured self-hosted deployments, demo-mode data exposure when `DEMO_MODE=true` was deliberately enabled by the operator, brute force on demo credentials.

## Known honest boundaries

The platform states its gaps instead of hiding them — see [docs/SECURITY.md](docs/SECURITY.md) (controls + what's still required) and [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md).
