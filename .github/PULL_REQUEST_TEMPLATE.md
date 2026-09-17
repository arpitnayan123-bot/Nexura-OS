## What does this PR do?

<!-- One or two sentences: what changed and why. -->

## Related issues

<!-- e.g. "Closes #12" or "Relates to #7" -->

## How was this verified?

<!-- Which gates did you run locally? -->

- [ ] `npm run typecheck` — clean
- [ ] `npm run lint` — clean
- [ ] `npm run test` — all passing (real-DB tests need Postgres + Redis running)
- [ ] `npm run build` — production build compiles
- [ ] New/changed API surface has a smoke check in `tests/api-smoke.sh`

## Conventions check

- [ ] Money values use integer minor units via `src/lib/money.ts` (no Float money)
- [ ] AI calls go through the `callOR` funnel (capability-labelled, metered, consent-gated)
- [ ] Schema changes are additive migrations (no destructive changes without maintainer sign-off)
- [ ] Demo-only behavior is labelled in the response `source` field — nothing fake pretends to be real

## Screenshots (if UI)

<!-- Before/after screenshots help a lot. -->
