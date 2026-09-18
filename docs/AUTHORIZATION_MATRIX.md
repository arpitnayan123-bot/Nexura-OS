# Authorization Matrix — Nexura Hospital OS

Permissions are **data** (`src/lib/nx/session.ts` → `ROLE_PERMISSIONS`), enforced on
every protected API route via `requirePermission()` / `guard()`. The OS shell mirrors
the same matrix to decide which apps appear per role — but the server is the
enforcement point.

## Permission catalog (36)

| Permission                | Meaning                                       |
| ------------------------- | --------------------------------------------- |
| patient.demographics.view | See patient identity/contact                  |
| patient.clinical.view     | See clinical data (notes, labs, meds)         |
| patient.restricted.view   | See restricted notes (behavioral health etc.) |
| patient.create            | Register new patients                         |
| encounter.create          | Open encounters/admissions                    |
| note.edit                 | Create/edit draft clinical notes              |
| note.sign                 | Sign notes (locks them immutably)             |
| medication.order.create   | Write medication orders                       |
| medication.order.view     | View medication orders/MAR                    |
| medication.administer     | Record dose administration                    |
| medication.dispense       | Pharmacy dispensing                           |
| beds.manage               | Manage bed lifecycle                          |
| bed.assign                | Assign patients to beds                       |
| appointments.manage       | Book/reschedule/cancel                        |
| appointments.view         | View schedules                                |
| communication.send        | Post in care channels                         |
| billing.view              | See financial data                            |
| billing.manage            | Charges/payments/refunds                      |
| reports.export            | CSV/report export                             |
| analytics.view            | Dashboards & KPIs                             |
| users.manage              | Manage accounts (suspend etc.)                |
| roles.manage              | Assign roles, grant permissions               |
| staff.manage              | Directory, credentials, shifts                |
| settings.manage           | System settings, banners                      |
| audit.view                | Read the audit chain                          |
| emergency.access          | Emergency department workflows                |
| labs.result.enter         | Enter lab results                             |
| labs.result.verify        | Verify/reject results                         |
| imaging.report.write      | Write imaging reports                         |
| inventory.manage          | Stock, POs, vendors                           |
| tasks.manage              | Work queue operations                         |
| features.manage           | Feature flags                                 |
| delegation.manage         | Grant/revoke delegations                      |
| breakglass.invoke         | Emergency record access                       |
| consent.manage            | Manage consent records                        |
| demo.reset                | Reset demo dataset                            |

## Role → permission highlights

Full matrix lives in code (single source of truth). Summary:

| Role                       | Sees                                                               | Cannot                             |
| -------------------------- | ------------------------------------------------------------------ | ---------------------------------- |
| **Platform Super Admin**   | Everything, all hospitals                                          | —                                  |
| **Organization Admin**     | Everything in their org                                            | demo reset                         |
| **Hospital Administrator** | All hospital modules, users, roles, audit                          | —                                  |
| **Department Admin**       | Their department's clinical + staff ops                            | org settings                       |
| **Doctor**                 | Clinical workspace, notes (sign), orders, labs verify, break-glass | billing manage, users manage       |
| **Nurse**                  | Tasks, MAR administer, beds, vitals, labs enter                    | note.sign, billing, users          |
| **Care Coordinator**       | Appointments, tasks, consents                                      | clinical writes                    |
| **Receptionist**           | Registration, appointments, billing view                           | clinical data                      |
| **Pharmacist**             | Dispensing, MAR view, inventory                                    | note edit/sign                     |
| **Lab Technician**         | Result entry                                                       | result verify (separation of duty) |
| **Radiology Technician**   | Imaging reports                                                    | labs                               |
| **Billing Officer**        | Charges/payments/claims/exports                                    | any clinical write                 |
| **Inventory Manager**      | Stock/POs/wastage                                                  | clinical, billing                  |
| **HR / Staff Manager**     | Directory, credentials, shifts                                     | clinical, billing                  |
| **Patient**                | Own record only (hard-scoped via linkedPatientId)                  | anything else                      |
| **Read-only Auditor**      | Audit chain, analytics, demographics                               | every write                        |

Legacy keys (`admin`, `leadership`, `command`, `facilities`, `lab`, `reception`,
`billing`) map to canonical roles via `LEGACY_ROLE_MAP` and keep working.

## Scoping layers

1. **Hospital (tenant):** every query filters by `session.hospitalId`; cross-hospital
   reads/writes return 403/404.
2. **Department:** `NxPermissionGrant.scope` + department-scoped role assignments
   (`NxUserRoleAssignment.departmentId`).
3. **Patient context:** `patient` role resolves `linkedPatientId`; anything else → 403
   `patient_scoped_only`. Care-team channels require `patient.clinical.view`.
4. **Time-boxed:** role assignments, permission grants and delegations all support
   `expiresAt`; break-glass events are 5–60 minutes by construction.

## Break-glass

`POST /api/nx/auth/break-glass` `{patientId, reason(min 10), minutes(5-60)}` →
re-issues the session token with `breakGlass: true`, unlocks `patient.clinical.view`

- `emergency.access` for that patient only, records an immutable audit event, and
  shows a persistent warning. Every subsequent record view is stamped
  `patient.view.breakglass`. Revoke anytime; auto-expires.

## Audited permission changes

Role assign/revoke, allow/deny grants, delegation create/revoke, and account
suspend/reactivate all write tamper-evident audit events (hash-chained) and
invalidate the in-process permission cache immediately.
