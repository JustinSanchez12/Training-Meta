# Spec: React port, slice 1 (tooling, game core, character creation, Hub)
Branch: feat/react-port-foundation

## Goal
A player can open the new React app, create a character (name, gender, age, weight) and land on the Hub, with progress saved to localStorage across reloads. This slice also sets up Vite, TypeScript, Vitest and Playwright so later slices only port screens. The full port is more than a day of work, so this spec covers slice 1 only.

## Scope
- In: Vite + React 18 + strict TS + ESLint + Vitest (jsdom, RTL) + Playwright (chromium), with an `@/` alias to `src/`. Game rules ported to typed code (stat definitions, XP curve, levels, default stats, createPlayer). Zod save schema and a storage interface backed by localStorage. React Router with Start, Character Creation (4-step wizard) and Hub. `styles.css` moved over mostly as-is. `vercel.json` SPA rewrite.
- Out: Stats grid, workout logging, Quest Log, Profile/reset (later slices). Supabase (no project yet). APE.
- Decisions:
  - Keep localStorage behind an async `SaveRepository` (`load`/`save`/`clear`) so Supabase can replace it later. Use the same key as legacy (`ape-storage-the-training-meta`) and a legacy-compatible schema, so old saves still load.
  - Drop the APE key gate (`js/auth.js` is already a no-op stub).
  - Move legacy files to `legacy/` in this PR, because Vite needs the root `index.html`. `npm run legacy` serves it. The folder is deleted in slice 4.
  - Copy CSS unchanged to `src/app/styles.css`. Screens use `className="screen active"` so the existing selectors still apply.
  - Keep Google Analytics (G-Q98010P7LZ) for parity.
  - Replace `alert()` validation with inline Zod error messages.

## Data
- No tables, migrations or env vars.
- `src/lib/game/schema.ts`: StatKey enum, StatProgress `{level 1..99, xp >= 0}`, Player, ExerciseEntry (loose `data` until slice 3), WorkoutEntry and SaveData `{ player, stats, workoutLog, dailyStreak, lastWorkoutDate }`.
- `src/features/character/schema.ts`: CharacterForm. Name is trimmed, 1–20 chars. Gender is an enum. Age is an int 1–120. Weight is > 0. Unit is `lbs|kg`.
- A corrupt or invalid save is treated as "no save".

## UI / flow
1. `/`: with no valid save, the Start screen shows. With a valid save, redirect to `/hub`.
2. START goes to `/create`, a 4-step wizard (name → gender → age → weight + unit), then a "Character Created" overlay, then `/hub`.
3. `/hub` shows the name, Level 1, Total Level 12, 0 day streak, and four panels. The unported panels are disabled and marked "Coming soon".
4. `/hub` with no save redirects to `/`.

## Acceptance criteria
- [ ] `typecheck`, `lint`, `test`, `build` and `test:e2e` all pass on a clean install with Node 24.
- [ ] `getXpForLevel`: 1 → 0, 2 → 20, 99 → 11573 (legacy formula `floor(L²·1.1 + 8L)`).
- [ ] `getLevelFromXp`: 0 and 19 → 1, 20 → 2, very large → 99.
- [ ] `getXpProgress` at max level returns progress 1 and xpForNext 0.
- [ ] Default stats give overall level 1 and total level 12.
- [ ] `SaveDataSchema` accepts a legacy save and rejects bad stat keys, negative XP and a missing player.
- [ ] `CharacterFormSchema` rejects an empty or whitespace name, a 21-char name, age 0, age 121, weight 0, and a missing gender.
- [ ] Storage returns null for missing or corrupt JSON and round-trips a valid save.
- [ ] The wizard doesn't advance past an invalid step and shows an error.
- [ ] E2E: create a character → Hub shows the name → reload keeps it. An empty name blocks step 1.

## Tests
- Unit: `tests/unit/lib/game/xp.test.ts`, `tests/unit/lib/game/schema.test.ts`, `tests/unit/lib/storage.test.ts`, `tests/unit/features/character/schema.test.ts`, `tests/unit/features/character/CharacterWizard.test.tsx`.
- E2E: `tests/e2e/character-creation.spec.ts`.

## Tasks
- [ ] Move `index.html`, `css/` and `js/` to `legacy/`, and update the `legacy` script.
- [ ] Install deps and add configs (tsconfig, vite + vitest, eslint, playwright, vercel.json).
- [ ] Add `index.html`, `src/main.tsx`, `src/app/App.tsx` and `src/app/styles.css`.
- [ ] Port `src/lib/game/{stats,xp,player,schema}.ts` with unit tests.
- [ ] Add `src/lib/storage.ts` and `src/app/PlayerProvider.tsx` with unit tests.
- [ ] Add `src/features/start/StartScreen.tsx`.
- [ ] Add `src/features/character/` (wizard, schema, overlay) with tests.
- [ ] Add `src/features/hub/HubScreen.tsx` with the route guard.
- [ ] Add the e2e spec, and update the README and the CLAUDE.md migration note.

## Later slices (not in this PR)
- Slice 2 `feat/react-port-stats`: Stats grid and stat detail panel.
- Slice 3 `feat/react-port-workout`: workout logging, XP gain, level-up overlay, streak, and per-type exercise schemas. Fix the legacy bug where the Weight form sends `currentWeight` but XP reads `change`, so Weight never earns XP. Decide whether streak dates use local time or UTC.
- Slice 4 `feat/react-port-log-profile`: Quest Log, Profile, reset with confirm. Delete `legacy/`.
