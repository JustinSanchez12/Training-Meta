# Refactor: dedupe screen headers and guards, remove unused CSS

**Rule: no behaviour change.** Estimated total: about 35–45 lines removed across 9 files (+1 component, +1 hook).

## Targets
1. **Guards → one `RequireSave` layout route** (about 15 lines)
   - The `const { save } = usePlayer(); if (!save) return <Navigate to="/" replace />` pattern appears 5×: Hub, Stats, Log, Profile and WorkoutLayout. ExerciseForm has `if (!save) return null`.
   - Wrap `/hub`, `/stats`, `/log`, `/profile` and `/workout` in `RequireSave` in App.tsx, and add a `useSave()` hook that returns a non-null save.
   - Start and the wizard are unchanged (their guards redirect the other way).
   - The redirect is still in the same commit. After a reset, focus must still land on Start's h1 (e2e check).
2. **Headers → `src/components/ScreenHeader.tsx`** (about 12 lines)
   - The same `.screen-header` + "← Hub" link + `h2` block appears 4× (Stats, Workout, Log, Profile); Stats adds `header-meta`.
   - The DOM stays byte-identical: `a.back-btn`, the h2 text and emoji, no wrapper element. It stays inside Stats' inert background.
3. **Unused CSS** (about 10 lines)
   - `.profile-stat-row span:first-child` (rows are now `dt`/`dd`).
   - `@keyframes slideIn` (unused).
   - The duplicate `grid-template-columns` in the 360px `.stats-grid` rule.
   - Kept on purpose: `.screen`/`.active` pairs (focus fallback), and the dynamic `show`/`fade`/`selected` modifiers.

## Risks
- `useSave()` outside the guard throws, so it's only used under `RequireSave`.
- Profile reset → Start focus timing: covered by `tests/e2e/log-profile.spec.ts`.

## Baseline (main @ 470ceb0)
- typecheck + lint clean · unit 384 passed · e2e 21 passed
- Lines: src/ 3753 (incl. CSS 1315) · tests/ 5040
