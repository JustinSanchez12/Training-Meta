# Spec: React port slice 4: Quest Log, Profile, weight goal, reset, remove legacy
Branch: feat/react-port-log-profile

## Goal
Players can read their workout history, view their profile, pick a lose/gain/maintain weight goal that changes how Weight XP is earned, and reset their character after confirming. This finishes the port, so `legacy/` is deleted. No Supabase yet: the localStorage `SaveRepository` stays.

## Scope
- In: `/log` and `/profile` routes, enabling the Hub panels, the weight goal, `resetCharacter()`, a Cancel option on ModalOverlay, the `finish()` owner check, and deleting `legacy/`.
- Out: Supabase, a wizard goal step, editing other profile fields, and re-pricing logged entries.
- Owner decisions: Maintain XP can be earned on every weigh-in (one per session). A goal change doesn't re-price a weigh-in already in the draft. The goal is set in Profile only, and new characters default to Lose.

## Data
- `WeightGoalSchema = z.enum(['lose','gain','maintain'])`. `PlayerSchema.weightGoal` defaults to `'lose'`, so legacy saves load.
- `calculateXpGain(stat, data, unit, goal = 'lose')`. `change` = previous − current, in lb:
  - lose: ≥ 0.5 lost
  - gain: ≥ 0.5 gained
  - maintain: |change| ≤ 0.5
  - Each earns 10 XP.
- `getXpRule(stat, goal)` gives goal-specific Weight text for ExerciseForm and statView. `clearSession(storage)`. No migrations or env vars.

## UI / flow
1. Hub → Quest Log (`/log`) and Profile (`/profile`). Both have the no-save guard, "← Hub" and an `h2`.
2. Quest Log: newest first by timestamp, local date, total XP, and exercises via `formatExerciseData`. Empty state: 📜 "No quests completed yet."
3. Profile: the legacy fields plus Weight Goal radios that save immediately (`setWeightGoal`).
4. Reset opens a ModalOverlay with Cancel (focused first) and Reset (danger).
   - Cancel or Escape closes it.
   - Reset runs `resetCharacter()` and goes to Start. If it fails, the dialog shows an error.
   - Reset is disabled while a workout is saving.
5. `resetCharacter()` throws if a workout save is in flight; otherwise it runs `repo.clear()` and then `setSave(null)`. The draft is cleared when the owner becomes null.
6. ModalOverlay gains optional `onAction`, `cancelLabel` and `danger`. The stack focuses `[data-initial-focus]`.

## Acceptance criteria
- [ ] A legacy save without `weightGoal` loads as `'lose'`.
- [ ] XP for each goal at the ±0.5 lb boundaries, including kg.
- [ ] The Weight form and stat detail show the current goal's rule.
- [ ] A goal change is saved and survives a reload.
- [ ] Quest Log shows the newest entry first with its local date; legacy null or missing data shows "—".
- [ ] Cancel or Escape keeps the save. Reset clears the save and the draft and lands on Start.
- [ ] `resetCharacter()` rejects while a workout save is in flight.
- [ ] `finish()` skips its synchronous draft write if the owner changed during the save.
- [ ] `legacy/` is gone, and lint, typecheck and build pass.

## Tests
- Unit: goal XP and `getXpRule`, the schema default, QuestLog, ProfileScreen, ModalOverlay cancel/action, PlayerProvider reset/goal, the provider owner guard and draft clear.
- E2E: `tests/e2e/log-profile.spec.ts`: create → log → Quest Log → goal Gain → reset → Start → reload stays on Start.

## Tasks
- [ ] Weight goal: schema, XP, `getXpRule`, ExerciseForm and statView.
- [ ] `setWeightGoal` and `resetCharacter` in PlayerProvider.
- [ ] `clearSession`, the null-owner clear and the `finish()` owner guard.
- [ ] ModalOverlay cancel/action/danger.
- [ ] `QuestLogScreen` and `/log`.
- [ ] `ProfileScreen` and `/profile`.
- [ ] Enable the Hub panels.
- [ ] Delete `legacy/` plus its script, eslint ignore and doc references.
- [ ] Unit and e2e tests. Tick this checklist.

## Later slices
- A wizard step for the weight goal, if wanted.
- Supabase (when the owner has an account): a cloud `SaveRepository` with auth and RLS, conflicts across tabs and devices, draft syncing, and a server-side reset.
