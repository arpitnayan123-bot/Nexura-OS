# Nexura PHI — Versioning

How engine, ruleset, and content versions are stamped, changed, and audited.

## 1. Version stamps on every assessment

Each run of the pipeline (`src/modules/phi/assessment/run.ts`, step 11) stamps three
versions onto the `PredictiveHealthAssessment` object **and** onto dedicated columns
of the persisted `PhiAssessment` Prisma row (`prisma/schema.prisma`,
`@@map("phi_assessments")`):

| Column | Filled from | Current value | Meaning |
|---|---|---|---|
| `engineVersion` | `PHI_ENGINE_VERSION` (`contracts.ts`) | `0.1.0` | Version of the analysis engine set (signals, patterns, trends, recommendations, summary, formatter) |
| `rulesetId` | `triageEngine.id` (mirrors `PHI_RULESET_ID`) | `nexura-redflag` | Which red-flag ruleset produced the triage outcome |
| `rulesetVersion` | `triageEngine.version` (mirrors `RULESET_VERSION` in `triage/ruleset.ts`) | `1.0.0` | Exact ruleset text that evaluated the input |
| `contentVersion` | `PHI_CONTENT_VERSION` (`contracts.ts`; `contentRepo.version` mirrors it) | `demo-1` | Version of the evidence/guidance content set |

Also persisted per row: `urgency`, `triageOnly`, `dataCompleteness`,
`followUpIntervalDays`, and `payload` (the full assessment JSON). Index:
`(subjectId, createdAt)`.

**Why two copies:** the columns make the row queryable/filterable (e.g., "show every
assessment ever produced under ruleset 1.0.0"); the payload preserves the exact
rendered artifact. The clinician summary repeats `rulesetVersion`/`engineVersion`
inside its own body, and the fixed `statement` line names both versions, so any
exported/shared artifact is self-identifying even out of context.

**Consumer visibility of versions:**

- `GET /api/nx/phi/status` (public): `engineVersion`, `rulesetVersion`,
  `contentVersion`, `killSwitch`, `demo: true`.
- Landing page and results screen render the stamps from `/status` and from the
  assessment payload respectively.

## 2. Ruleset change process (`nexura-redflag`)

The ruleset is code: `src/modules/phi/triage/ruleset.ts`. Rules are pure, deterministic
functions with mandatory governance metadata per rule (`RedFlagRule` type):
`description`, `trigger`, optional `exclude` guard, `urgency`, `userAction`,
`whyRemoteAssessmentUnsafe`, `careNavigation`, `evidenceNote`, `clinicalReviewer`,
`dateCreated`, `dateLastReviewed`, `nextReviewDate`, `version`. **The metadata block
must never be removed from a rule.**

Change procedure (in order):

1. **Edit rules** in `ruleset.ts` — add/modify/remove `RedFlagRule` entries. Rules
   evaluate combinations, never single fields in isolation; keep that property.
2. **Bump `RULESET_VERSION`** in `ruleset.ts` (semver: new rule or threshold change =
   minor at minimum while unreviewed; any behavioral change after clinical sign-off
   requires reviewer re-approval). Keep `PHI_RULESET_VERSION` in `contracts.ts` in
   sync — it feeds `/status` and the assessment stamp.
3. **Clear or fill the review gate.** `assertRulesetReviewable(rules)` runs at module
   load of `triage/engine.ts`:
   - `PHI_ALLOW_UNREVIEWED_RULES=1` → gate skipped silently (dev convenience only);
   - unset (demo default) → boots with a loud `console.warn` naming the count of
     `clinicalReviewer === "PENDING"` rules;
   - **production:** the warn must be flipped to `throw()` so an unreviewed ruleset
     refuses to boot.
4. **Update/extend regression tests** in `tests/unit/phi/` — the ruleset's safety
   contract is pinned by the suite (urgency escalation, escalation-on-uncertainty,
   `matchedRuleIds` audit, exclusion guards). A ruleset change without a test
   change is incomplete.
5. **Record the change** in this file's change log below and in `worklog.md`, and
   update `RULESET_NEXT_REVIEW` (demo value `2026-12-11`).

**Audit linkage:** every run persists `matched_rules` (fired rule ids, incl.
`<id>:EVAL_ERROR` markers) inside the `assessment.completed` audit meta, so any
post-hoc question of "what did ruleset X do for subject Y" is answerable without the
payload.

### Change log (demo)

| Ruleset version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-09-11 (demo stamps) | Initial 16-rule ruleset, all `clinicalReviewer: "PENDING"` |

## 3. Content item lifecycle

Evidence/guidance content ("drink ORS safely", "katori portion guide", …) resolves
through `contentRepo` (`assessment/engines.ts`) with a **never-invent** fallback
chain:

```
DB (PhiContentItem, status = approved, not expired)  →
static CATALOG (content-catalog.ts, 10 approved demo rows, demo-1/en)  →
SAFE_PLACEHOLDER ("…being clinically reviewed and is not shown yet…", status: "placeholder")
```

`PhiContentItem` status values and their meaning:

| Status | Behavior |
|---|---|
| `draft` | Never served to users; engine falls through to catalog/placeholder |
| `approved` | Served, with `sourceAuthority — sourceTitle` attribution; requires `reviewedBy`, `version`, optional `expiresAt` (ISO-date comparison vs. today) |
| `retired` | Never served; the key falls through as if absent |

Rules:

- Unapproved/expired/missing keys **always** render the safe placeholder — a content
  gap can degrade specificity but can never produce invented guidance.
- `contentRepo.resolveMany()` batches keys in one DB round-trip; an empty key list
  short-circuits with zero DB access (unit-tested).
- Every content row carries `version`; `contentVersion: demo-1` on the assessment is
  the set-level stamp. **Bump `PHI_CONTENT_VERSION` whenever approved content text
  changes**, so historical assessments remain interpretable.
- Demo catalog rows are stamped `sourceAuthority: "ICMR-NIN Dietary Guidelines for
  Indians 2024 (demo posture)"`, `reviewedBy: "PENDING (demo)"`, `reviewedAt:
  2026-09-11`, `jurisdiction: IN`, `language: en` — the `PENDING` reviewer is the
  same demo gate as the ruleset's.

## 4. Model provider swap path (`RiskModelProvider`)

The risk-model slot is intentionally empty of any statistical model. v0.1 ships a
deterministic signal provider (`assessment/risk-signals.ts`) behind the
`RiskModelProvider` contract (`contracts.ts`):

```ts
export interface RiskModelProvider {
  readonly id: string;      // stamped identity of the provider
  readonly version: string; // stamped per assessment via engineVersion discipline
  generateSignals(context: AssessmentContext): RiskSignal[];
}
```

Swap path for a validated model later:

1. Implement the interface as a new module under `assessment/` (pure function of
   `AssessmentContext` → `RiskSignal[]`; no DB, no I/O, deterministic or explicitly
   versioned).
2. Give it a new `id` + `version`; **bump `PHI_ENGINE_VERSION`** in `contracts.ts`
   (and mirror it in the provider) so every assessment remains attributable to the
   exact code that produced it.
3. Re-point the export in `assessment/engines.ts` (`riskSignalProvider` is
   re-exported there as the single engine import surface for `run.ts`).
4. Keep the invariants: outputs carry confidence **categories only** (never numeric
   probabilities — type `RiskSignal` enforces `notADiagnosis: true` and the category
   union), and the `tests/unit/phi/phi-risk-signals.test.ts` invariants
   (no-probability-field, determinism, severity ordering) must pass against the new
   provider.
5. Triage stays in front regardless of provider: a model can never run before the
   red-flag pass, never alter urgency, and never short-circuit step 5
   (`run.ts` position lock).

The same swap discipline applies to the other contract interfaces
(`TrendAnalysisEngine`, `RecommendationEngine`, `ExplanationEngine`,
`ClinicianSummaryGenerator`, `LLMFormatter` — the last gated by `isSafeRephrase` as
described in `THREAT-MODEL.md` §2.6).

## 5. What versioning does and does not guarantee

**Guarantees:** every persisted assessment is attributable to an exact
engine × ruleset × content combination; audits carry the fired rule ids; the public
status endpoint reflects what is live right now; regression tests pin behavioral
safety contracts across versions.

**Does not guarantee (yet):** historical replay (re-running an old input through an
old ruleset) — inputs are not snapshotted versioned alongside assessments; and
content `version` values are free-form strings, not enforced-semver. Both are
pre-production items if assessments ever carry clinical weight.
