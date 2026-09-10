# Incident Response Runbook

## Severity model

- **S1 critical** — patient-data exposure, auth bypass, total outage
- **S2 major** — module down, data-integrity risk, degraded clinical workflows
- **S3 minor** — non-blocking bugs, cosmetic issues

## Immediate actions (S1)

1. **Contain:** enable maintenance mode — `PUT /api/nx/system-status`
   `{key:"maintenance_mode", enabled:true, message:"..."}` (settings.manage).
   Route guards treat it as a banner; for a hard stop, scale the app to zero /
   block at the edge.
2. **Revoke access:** for a suspected account — staff ops → suspend (revokes all
   sessions instantly). For global suspicion — rotate `JWT_SECRET` (invalidates
   every token) and redeploy.
3. **Assess scope:** `GET /api/nx/audit?q=...` — the hash chain shows every
   touched record; `GET /api/nx/auth/break-glass` lists emergency access.
4. **Preserve evidence:** snapshot `db/custom.db` (or DB volume) before fixes;
   audit chain integrity can then be demonstrated.
5. **Communicate:** set the incident banner (visible in-product):
   `PUT /api/nx/system-status {key:"incident_banner", enabled:true, severity:"critical", message:"..."}`.

## Post-incident

- Root-cause with structured logs (`dev.log` / platform logs; every request has
  `x-request-id`).
- File the timeline; update KNOWN_LIMITATIONS if a gap was exploited.
- Verify audit chain integrity (recompute hashes) if tampering is suspected.

## Rollback procedure

1. `git checkout <previous-release-tag>` → `bun install --frozen-lockfile`.
2. `bunx prisma migrate deploy` (migrations are forward-only; roll back code
   without rolling back additive migrations).
3. Redeploy (docker: `docker compose up -d --build` on the older image tag).
4. If the schema must roll back: restore the DB volume from the pre-deploy backup.

## Health signals to watch

- `GET /api/ready` — DB latency, seed presence, env validity (503 = degraded)
- Structured logs: `"level":"error"` lines with `subsystem:"api"`
- `NxLoginAttempt` spikes → credential stuffing (lockout engages automatically)
- `NxWebhookDelivery` with `status:"failed"|"dead"` → integration problems
