# Spec: React port, slice 2 (Stats grid and stat detail panel)
Branch: feat/react-port-stats

## Goal
From the Hub, a player can open the Stats screen and see all 12 stats with their level and progress. Tapping a stat opens a detail panel with its level, XP progress, total XP, category and XP rule. The screen is read-only and behaves like legacy `#screen-stats`.

## Scope
- In: `/stats` route with a guard (no save sends you to `/`). The Hub "Stats" panel is enabled and links to it; the other three panels stay "Coming soon". The screen has a header ("← Hub", "⚔️ Stats", "Total Level: N"), a 3-column grid in `STAT_ORDER`, the detail panel, and pure display helpers with unit tests.
- Out: Workout logging, XP gain, Quest Log, Profile (slices 3–4). No data, schema or storage changes.
- Decisions:
  - Detail panel state is local (`selectedStat: StatKey | null`), not a URL param, as in legacy. It renders as `.stat-detail-panel.active` using the existing CSS.
  - Cells are `<button type="button" className="stat-cell">` (legacy used divs) with the accessible name "<Name>, level N". Button resets go in `src/app/port.css`, so `styles.css` stays identical to legacy.
  - The panel is `role="dialog"` with `aria-labelledby` set to its `h2`. "← Back" and Escape both close it. Focus moves to Back on open and returns to the cell on close.
  - Fill width is `progress × 100%`, and 100% at MAX_LEVEL. At max level the detail shows "MAX LEVEL" instead of "x / y XP".
  - XP is floored for display, because legacy saves can hold float XP. Levels still come from the raw XP.
  - Category is capitalised for display ("Strength"). Legacy showed the raw lowercase key.

## Data
None. Reads `save.stats` from `usePlayer()`. New helper `src/features/stats/statView.ts`:
`getStatView(key, stat) → { key, name, icon, level, fillPercent, isMax, xpText, totalXp, categoryLabel, xpRule }`.

## UI / flow
1. On `/hub`, the Stats panel is enabled ("View your skills") and goes to `/stats`.
2. `/stats` shows the header with Total Level and 12 cells (icon, name, level, XP bar).
3. Tapping a cell opens the detail panel: the icon and name, Level, a large XP bar and text, and the Total XP, Category and XP Rule rows.
4. "← Back" or Escape closes the panel. "← Hub" returns to `/hub`.
5. `/stats` with no save redirects to `/`.

## Acceptance criteria
- [x] `getStatView` for 0 XP: level 1, fillPercent 0, xpText "0 / 20 XP".
- [x] benchPress at 30 XP: level 2, "10 / 13 XP", fillPercent ≈ 76.9.
- [x] Float XP 3.0000000000000004: "3 / 20 XP", totalXp 3.
- [x] 11573 XP or more: isMax, fillPercent 100, "MAX LEVEL".
- [x] categoryLabel "Cardio" for mileRun, and xpRule from `STAT_DEFINITIONS`.
- [x] StatsScreen renders 12 cell buttons in `STAT_ORDER` and the correct Total Level.
- [x] Clicking a cell opens a dialog with that stat's details. Back and Escape each close it.
- [x] The Hub Stats panel is enabled and links to `/stats`. The other three panels are still disabled.
- [x] `/stats` with no save redirects to `/`.
- [x] E2E: seeded save → Hub → Stats → Bench Press level 2 and Total Level 13 → open Bench Press → "10 / 13 XP", "Strength" and "sets × reps = XP" → Back → ← Hub.

## Tests
- Unit: `tests/unit/features/stats/statView.test.ts`, `tests/unit/features/stats/StatsScreen.test.tsx`, `tests/unit/features/hub/HubScreen.test.tsx`.
- E2E: `tests/e2e/stats.spec.ts`. Seed `legacySave()` via `page.addInitScript`. Add a second test: `/stats` with no save redirects to Start.

## Tasks
- [x] Add `src/features/stats/statView.ts`.
- [x] Add `src/features/stats/StatDetailPanel.tsx` (dialog, Back, Escape, focus).
- [x] Add `src/features/stats/StatsScreen.tsx` (guard, header, grid, selected state).
- [x] Register `/stats` in `src/app/App.tsx`.
- [x] Enable the Stats panel in `src/features/hub/HubScreen.tsx`.
- [x] Add button resets for `.stat-cell` in `src/app/port.css`.
- [x] Add unit and e2e tests. Tick this checklist.

## Later slices (not in this PR)
- Slice 3 `feat/react-port-workout`: workout logging, XP gain, level-up overlay, streak, and per-type exercise schemas. Fix the legacy bug where the Weight form sends `currentWeight` but XP reads `change`, so Weight never earns XP. Decide whether streak dates use local time or UTC.
- Slice 4 `feat/react-port-log-profile`: Quest Log, Profile, reset with confirm. Delete `legacy/`.
