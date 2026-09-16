# Demo Credentials

All accounts: password **`Demo@12345`** · legacy PIN **`2468`**.
Sign in at `/hospital` → "Explore demo roles" fills the form; you press Sign in.
Every sign-in is real, audited, and can be MFA-protected like production.

| Role | Staff code | Email | What you can access |
|---|---|---|---|
| Platform Super Admin | `SA.DEV` | superadmin@demo.nexura.health | Everything, every module, permission matrix, demo reset |
| Hospital Administrator | `ADM.SUNIL` | admin@demo.nexura.health | All hospital modules, users & roles, audit, settings |
| Doctor | `DR.RAJESH` | doctor@demo.nexura.health | Clinical workspace, notes (draft→sign), orders, labs verify, break-glass |
| Nurse | `NS.PRIYA` | nurse@demo.nexura.health | Shift tasks, MAR administration, beds, vitals, labs entry |
| Receptionist | `RC.MEERA` | reception@demo.nexura.health | Registration, scheduling + waitlist, check-in, billing view |
| Pharmacist | `RX.KAVITA` | pharmacy@demo.nexura.health | Dispensing queue, MAR view, inventory, stock txns |
| Lab Technician | `LAB.SURESH` | lab@demo.nexura.health | Specimen queue, result entry (not verification) |
| Billing Officer | `BILL.ARVIND` | billing@demo.nexura.health | Charges, payments, refunds, claims, CSV export |
| Patient | `PAT.ARBOR` | patient@demo.nexura.health | **Own record only** — demographics + appointments (try opening another patient → 403) |
| Operations Executive | `CEO.NEHA` | executive@demo.nexura.health | Analytics, revenue, compliance overview, settings |
| Radiology Tech | `RAD.INDER` | radiology@demo.nexura.health | Imaging reports |
| Inventory Manager | `INV.GANESH` | inventory@demo.nexura.health | Stock, POs, vendors, wastage |
| HR Manager | `HR.FATIMA` | hr@demo.nexura.health | Staff directory, credentials, shifts |
| Auditor (read-only) | `AUD.VIKAS` | auditor@demo.nexura.health | Audit chain + analytics only — no writes anywhere |
| Care Coordinator | `CC.ROSHNI` | coordinator@demo.nexura.health | Appointments, tasks, consents |
| Command Center (legacy) | `CMD.ANITA` | command@demo.nexura.health | Live ops: beds, tasks, ED, coordination |
| Facilities (legacy) | `FAC.RAKESH` | facilities@demo.nexura.health | Beds, equipment, cleaning workflows |

**Nice demo paths**
1. Doctor → open a patient → timeline, consents, MAR, access history (your view is audited).
2. Doctor → write a note → sign it → try to edit (blocked 423) → add addendum.
3. Nurse → Work Queue → claim a task → complete it with a note.
4. Lab → enter/verify result; critical results notify doctor + command center live.
5. Billing → record a payment twice with the same `x-idempotency-key` (curl) — one payment.
6. Admin → Administration → permission matrix: grant `auditor` a time-boxed role.
7. Anywhere: ⌘K palette, F9 overview, ⌘L lock screen (PIN 2468).
8. Watch the notification center while a second browser (lab) verifies a critical result.

**Reset demo data:** Demo data resets by re-running the seed scripts (bun scripts/seed-*.ts)
in a non-production environment; there is no runtime reset endpoint.
