# Authentication — Nexura Hospital OS

## Sign-in methods

| Method | Payload | Notes |
|---|---|---|
| Email + password | `{email, password, rememberDevice?}` | Production path. bcrypt cost 12. |
| Staff code + PIN | `{staffCode, pin}` | Demo fast path — real auth, same session machinery. |
| MFA step-up | `{..., mfaToken, mfaCode}` | Required when `mfaEnabled`; TOTP RFC-6238, ±1 step drift. |

Both paths run through `POST /api/nx/auth` and are identically audited — the demo
button **fills the form**, it never bypasses authentication.

## Session model

- JWT access token in `nx_access` HttpOnly SameSite=Lax cookie (12h; 30 days with
  remembered device), carrying `userId, role, name, jti, staffCode, hospitalId,
  breakGlass`.
- Every sign-in creates an **`NxSessionRecord`** (jti, user-agent, IP, expiry).
  Guards (`getSessionFresh` / `requirePermission`) re-check the record —
  revocation is immediate and server-side.
- **Sign out current device:** `DELETE /api/nx/auth` or `POST /api/nx/auth/logout`.
- **Sign out everywhere else:** `DELETE /api/nx/auth/sessions {all:true}`.
- Password reset revokes every session automatically.

## Progressive lockout

Per-account counter on every failed attempt. From the 5th failure the account locks
for `2^(n-4)` minutes, capped at 30. The response includes remaining-attempt warnings
at ≤2 left. Per-IP: 20 login attempts / 10 min. Every attempt (success or failure,
with reason) lands in `NxLoginAttempt`; failures also emit structured log lines.

## Account states

`active` · `suspended` (403 account_suspended) · `deactivated` (403). Suspend also
revokes all live sessions immediately (staff ops → suspend/reactivate).

## Password reset & email verification

`POST /api/nx/auth/password {email}` issues a single-use SHA-256-hashed token (1h).
`PATCH` consumes it, sets the new password, revokes all sessions. Email transport is
**console** in demo (tokens printed to the structured log — visible in dev.log);
switch `EMAIL_TRANSPORT=smtp` and wire an SMTP provider in production
(integration point, see KNOWN_LIMITATIONS).

## MFA (TOTP)

1. `POST /api/nx/auth/mfa` → secret + `otpauth://` URL (Google Authenticator-compatible).
2. `PUT` with first code → `mfaEnabled`.
3. `DELETE` with account password disables.

## Break-glass

See AUTHORIZATION_MATRIX.md. Time-boxed (5–60 min), reason mandatory, audited at
invoke + every record view, re-issues token with `breakGlass:true`, revocable early.

## What the demo banner means

`DEMO_MODE=true` shows the "Demo environment — synthetic data" indicator after
login and enables demo tooling. Set `DEMO_MODE=false` in production; sign-in and
RBAC behave identically either way.
