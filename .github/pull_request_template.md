<!-- Thank you for contributing to Nexura OS! Please fill out this template so
     reviewers can verify your change against the platform's quality gates. -->

## Summary

<!-- One or two sentences: what does this PR change? -->

## Motivation

<!-- Why? Link the issue: Fixes #___ (or describe the gap) -->

## What changed

- [ ] Code
- [ ] Tests
- [ ] Documentation
- [ ] Screenshots / demo media

## Testing

<!-- How was this verified? The CI chain runs: typecheck → lint → prisma
     validate → migrations → seed → 345 unit tests (real Postgres + Redis) →
     49-check API smoke → standalone build. Describe anything beyond that. -->

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run test` passes (add/extend tests for behavior changes)
- [ ] New API surface covered in `tests/api-smoke.sh`

## Honesty checklist (platform-specific)

<!-- Nexura OS labels every non-real behavior. Keep it that way. -->

- [ ] No fake data where a real integration belongs — new not-yet-wired
      capabilities return an explicit `501` / labelled `source`, per
      [docs/KNOWN_LIMITATIONS.md](../docs/KNOWN_LIMITATIONS.md)
- [ ] Money values stay integer minor units (paise/cents) through
      `src/lib/money.ts`
- [ ] New AI call sites flow through the `callOR` governance funnel with a
      capability label

## Screenshots

<!-- If the change touches UI, attach before/after captures. -->
