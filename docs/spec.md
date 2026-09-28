# Spec: React port, slice 3a (Log Workout: session, exercise forms, finish)
Branch: feat/react-port-workout

## Goal
From the Hub, a player can build a workout session from the 12 exercises, log each one through a validated per-type form, and finish the session. Finishing awards XP, updates levels, the streak and the workout log, and saves. This ports legacy `#screen-workout` and `#screen-exercise-form` and fixes the Weight, UTC-date and float-XP bugs.

## Scope
- In: routes `/workout` and `/workout/:stat`, both guarded (no save sends you to `/`). The Hub "Log Workout" panel is enabled. Adds per-type input schemas, pure game logic in `lib/game/workout.ts`, the `logWorkout` provider action, and an inline empty-session error.
- Out (3b): the XP-gain popup, the level-up overlay, and keeping the session across a reload. Out (slice 4): Quest Log and Profile.
- Decisions:
  - **Routing:** `/workout` shows the selector and the session. `/workout/:stat` shows the form. `:stat` is parsed with `StatKeySchema.safeParse`, and an invalid value redirects to `/workout`. Session state lives in a `WorkoutLayout` parent route (`useState` + `<Outlet context>`), so it survives moving between the two routes. Like legacy, it is memory only and a reload clears it.
  - **Weight (owner decision: loss only, one weigh-in per session):**
    - The form takes `currentWeight` in `player.weightUnit`.
    - `change = player.currentWeight - currentWeight`, compared with the last saved weight.
    - XP is 10 if the change is at least 0.5 lb (1 kg = 2.20462 lb), otherwise 0. Saved data is `{ currentWeight, change }`.
    - Logging Weight again in the same session **replaces** the earlier weigh-in, so at most one earns XP and typos can be corrected.
    - On finish, `player.currentWeight` becomes the logged weight. A lose/gain/maintain goal is planned for slice 4.
  - **Streak dates:** use local dates via `toLocalIsoDate(now)`. "Yesterday" is `new Date(y, m, d - 1)`, which is DST-safe. If the saved `lastWorkoutDate` is later than today (an old UTC save), the streak and date are left unchanged. `WorkoutEntry.date` is local; timestamps stay UTC ISO.
  - **Float XP:** every gain is rounded to 1 decimal (`Math.round(x * 10) / 10`). `totalXp` is the rounded sum.
  - **Save strictness:** `ExerciseEntrySchema.data` stays loose, because legacy saves hold `{currentWeight}`-only data, nulls and strings. New entries are validated by the input schemas before they enter the session.
  - **Empty finish:** the legacy `alert()` becomes an inline `role="alert"` message: "Add at least one exercise before finishing!". If saving fails, show "Couldn't save your workout. Try again." and keep the session.

## Data
No DB, migration or env changes. New `src/lib/game/exercise.ts` with Zod input schemas (form strings through `z.coerce.number()`):
- reps: sets int 1–100, reps int 1–1000, weight 0–2000 (optional)
- distance: distance 0.1–200
- laps: laps int 1–1000
- session: sessions int 1–20, duration int 1–1440 (optional)
- weight: currentWeight 20–1500
- meal: meals int 1–10, description trimmed, max 200, optional

## UI / flow
1. Hub → "Log Workout" (enabled, "Train & earn XP") → `/workout`.
2. `/workout` shows "← Hub", "🏋️ Log Workout", the exercise buttons grouped by category, "Current Session" (an empty message or the entries, each with ✕), "Total: +N XP (M exercises)" and "✅ Finish Workout".
3. Tapping an exercise opens `/workout/:stat`: "← Back", the icon and name, the XP rule, the fields, and "⚔️ Log Exercise". Invalid input shows inline errors.
4. A valid submit adds the entry and returns to `/workout`. ✕ ("Remove <Name>") removes an entry.
5. Finish with an empty session shows the inline error. Otherwise it applies the workout, saves, clears the session and goes to `/hub`.

## Acceptance criteria
- [ ] `calculateXpGain`: bench 3×10 = 30. mileRun 0.3 = 3. cycling 0.3 = 1.5. swimming 4 = 20. yoga 2 = 20. meal 3 = 15.
- [ ] Weight: 180 lb → 179.5 = 10 XP, 179.8 = 0, 181 = 0. 80 kg → 79.7 kg = 10 XP.
- [ ] A second Weight entry in a session replaces the first.
- [ ] Input schemas reject 0 sets, 101 sets, 1.5 reps, 0.05 miles, NaN and empty required fields. They accept a missing lift weight or meal description.
- [ ] `updateStreak`: same day leaves it unchanged. Local yesterday adds 1. A gap resets to 1. `''` becomes 1. A future date is left unchanged. 23:30 local time counts as today.
- [ ] `applyWorkout(save, exercises, now)` returns a new save without mutating the input. It adds XP and levels, prepends the entry, updates `currentWeight`, and returns `levelUps[]`.
- [ ] Legacy saves with `{currentWeight}`-only or null data still load.
- [ ] `/workout/notAStat` redirects to `/workout`. `/workout` and `/workout/squat` with no save redirect to `/`.
- [ ] Finishing an empty session shows the inline alert, and nothing is saved.
- [ ] The Hub Log Workout panel is enabled. Quest Log and Profile stay disabled.
- [ ] E2E: seeded save → Log Workout → Bench 3×10 + Mile Run 0.3 → +33 XP → Finish → Hub shows a 1-day streak → Stats shows Bench Press level up.

## Tests
- Unit: `tests/unit/lib/game/workout.test.ts`, `tests/unit/lib/game/exercise.test.ts`, `tests/unit/features/workout/*.test.tsx`, `tests/unit/app/PlayerProvider.test.tsx` (logWorkout), an update to `HubScreen.test.tsx`.
- E2E: `tests/e2e/workout.spec.ts` (happy path `@smoke` + empty finish).

## Tasks
- [ ] Add `lib/game/exercise.ts` (input schemas) and update the `ExerciseEntrySchema` comment and types.
- [ ] Add `lib/game/workout.ts` (`calculateXpGain`, `buildExerciseEntry`, `formatExerciseData`, `toLocalIsoDate`, `updateStreak`, `applyWorkout`).
- [ ] Add `logWorkout` to `playerContext.ts` and `PlayerProvider.tsx`.
- [ ] Add `features/workout/` (`WorkoutLayout`, `WorkoutScreen`, `ExerciseForm`, `SessionList`).
- [ ] Register the nested routes in `App.tsx`. Enable the Hub panel.
- [ ] Add any button resets to `src/app/port.css` only.
- [ ] Add unit and e2e tests. Tick this checklist.

## Later slices
- 3b `feat/react-port-workout-feedback`: the XP-gain popup on log, the level-up overlay after finishing (using `levelUps`), and possibly keeping the session in `sessionStorage` (Zod-validated).
- Slice 4 `feat/react-port-log-profile`: Quest Log, Profile (plus a lose/gain/maintain weight goal), reset with confirm. Delete `legacy/`.
