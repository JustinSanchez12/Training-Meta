---
name: testing
description: What to unit test vs. e2e test in The Training Meta, where tests live, and how to run them. Use when writing, running or debugging tests.
---

# Testing

## Unit vs. e2e

| Unit test (Vitest, `tests/unit/`) | E2E test (Playwright, `tests/e2e/`) |
|---|---|
| Pure logic: XP math, level curve, stat rules | A user completing a real flow in the browser |
| Zod schemas: valid and invalid input | Sign in → log a workout → see XP/level change |
| Hooks and components with mocked Supabase | Navigation, forms, error messages people see |
| Edge cases: 0, negatives, level 1 and level 99 | One happy path + one key failure per feature |
| Fast, no network | Slower, real build (`vite preview`) |

Rule of thumb: if it's a calculation or a branch in code, unit test it. If it's something a player
does, e2e test it. Don't e2e test every edge case, because unit tests are cheaper.

## Conventions
- Unit test paths mirror `src/`: `src/features/stats/xp.ts` → `tests/unit/features/stats/xp.test.ts`.
- E2E: one file per feature, `tests/e2e/<feature>.spec.ts`.
- Mock Supabase in unit tests with `vi.mock('@/lib/supabase')`. Never hit the real project from unit tests.
- E2E runs against local Supabase (`npx supabase start`) or a dedicated test project. **Never production.**
- Selectors: `getByRole` / `getByLabel` / `getByText`. `data-testid` only as a last resort.

## Run

```bash
npm test                          # all unit tests once
npm run test:watch                # watch mode
npx vitest run tests/unit/lib     # one folder

npx playwright install chromium   # first time only
npm run test:e2e                  # all e2e (builds + previews the app)
npx playwright test stats --headed   # one spec, visible browser
npx playwright show-report        # open the last HTML report
```

## Debugging failures
- E2E failures save a trace. Open it with `npx playwright show-trace test-results/<...>/trace.zip`.
- You can also use the Playwright MCP to open the page and inspect it live.
