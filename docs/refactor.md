# Refactor: dedupe test setup and fixtures

**Rule: no behaviour change and no assertion changes.** Test names and counts stay the same.

## Targets (net lines, after counting helper code)
1. **Shared unit-test harness pieces: about −60 net.**
   - `createMemoryRepository`, `WaitForLoad` and `LocationProbe` are copied verbatim in the HubScreen, StatsScreen and CharacterWizard tests. They're identical to the ones in `features/workout/renderWorkout.tsx` / `TestHarness.tsx`.
   - Move `TestHarness.tsx` and `memoryRepository.ts` (with `pendingSave`) into `tests/unit/helpers/`, and import them everywhere.
   - About 8 import paths change.
2. **(e2e, edits spec files but not assertions; needs the owner's OK) `seedSave` helper: about −15 net, borderline.**
   - Three specs seed localStorage three different ways (every load / once per tab / once plus "yesterday"), and `SAVE_KEY` is declared 5 times.
   - Medium risk: the once-vs-always flag decides what a reload does.

## Dropped (net under 15, or would change what's tested)
- A generic render helper (about −10), the pending-promise helpers (about −12).
- `repositoryWith` stubs (deliberately different), console spies (one line each).
- Storage fakes (single-use each), inline fixture variants (already use `fixtures/saves.ts`).
- The e2e "create character" steps (the copies check different things), JSON readers (2 lines each).

## Realistic total
About −60 lines (unit only), or about −75 with target 2. That's about 1% of `tests/` (5,046 lines): most test lines are distinct cases, not copied setup.

## Baseline (main @ 8e691bc)
- typecheck + lint clean · unit 384 passed (24 files) · e2e 21 passed · tests/ 5046 lines

## After (target 1 only, per the owner)
- typecheck + lint clean · unit 384 passed (24 files) · e2e 21 passed · no e2e spec or src/ file changed
- tests/ 4976 lines: **−70 net**
- Diff audit: the only non-import changes are the moved helpers (no assertion touched)
