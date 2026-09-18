# Nexura OS Platform Integration

Hospital OS is a first-class product inside the Nexura OS ecosystem. Integration
happens **only** through typed provider contracts — Hospital OS never calls
platform internals directly, so remote adapters can replace local ones without
touching product code.

## Contracts (`src/lib/nexura/types.ts`)

| Provider               | Contract                                |
| ---------------------- | --------------------------------------- |
| `IdentityProvider`     | currentUser, listOrganizations          |
| `NotificationProvider` | push, list, markRead                    |
| `CalendarProvider`     | eventsFor (appointments/shifts/surgery) |
| `TaskProvider`         | countsFor (open/critical/overdue)       |
| `MessagingProvider`    | unreadFor                               |
| `FileStorageProvider`  | put, get                                |
| `SearchProvider`       | search (cross-entity)                   |
| `AuditProvider`        | record (unified audit identity)         |
| `AutomationProvider`   | fire (trigger → workflow)               |
| `FeatureFlagProvider`  | isEnabled, all                          |

## Adapters

- **`local.ts` (default, `NEXURA_MODE=local`)** — every contract backed by this
  app's own tables. Full functionality in dev/demo.
- **`remote` (`NEXURA_MODE=remote`)** — production wiring point. Implement the
  same interfaces against `NEXURA_API_URL`. Currently warns and falls back to
  local adapters per-provider (explicit, logged integration point — not a silent
  mock).

## In-product surface

- **Product switcher** in the Hospital OS system bar → Nexura OS Home, Connect,
  Patient Portal, Pharmacia, Clinic Suite, Global Network (deep links,
  unified identity).
- **Shared notification center** — server notifications + live SSE events.
- **Unified audit identity** — staff codes + roles flow into the hash-chained
  audit chain, usable as the platform's audit provider.
- **Cross-product search** — `/api/nx/search` is the SearchProvider backend;
  the platform palette can call the same contract.

## Design rules

1. Providers are resolved once per process (`nexura()` registry, cached).
2. No circular imports: Hospital OS → contracts → adapters.
3. Contract changes are semver-relevant for the platform team.
