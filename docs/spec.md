# Spec: React port, slice 3b (workout feedback: XP popup, level-up overlay, durable session)
Branch: feat/react-port-workout-feedback

## Goal
When a player logs an exercise, they see and hear a "+N XP" popup. When a finished workout raises any stats, a level-up dialog appears. The in-progress session now survives a reload, and leaving the screen mid-save can no longer lose the session or the save error. This ports legacy `showXpGainAnimation`, `showLevelUpAnimation` and `finishWorkout`.

## Scope
- In: the XP popup on add; the level-up overlay after Finish; the session kept in `sessionStorage` (Zod-validated); session state and Finish moved above the routes; session-local ids; a shared modal component; reduced-motion CSS.
- Out: a "workout saved" toast when there are no level-ups (legacy just went to the Hub); multi-tab save conflicts (Supabase slice); Quest Log and Profile (slice 4).
- Decisions:
  - **Storage scope (owner decision): this tab only** (`sessionStorage`). A reload keeps the draft; closing the tab discards it.
  - **Owner check:** the stored draft records `owner = save.player.createdAt`. A mismatch (e.g. after a reset in slice 4) drops the draft.
  - **Leaving mid-save:** `WorkoutSessionProvider` sits above `<Routes>` and owns items, `finish()`, `finishing` and `finishError`. A failed save keeps the items and the error, which show when the player returns. A late success only navigates if the Finish screen is still mounted.
  - **Ids:** each session item is `{ id, entry }`. The saved `WorkoutEntry` shape doesn't change; `logWorkout` receives the bare entries.
  - **Level-up overlay:** rendered by the provider when there are level-ups, with all of them in one dialog (as legacy). Focus goes to Continue and is trapped there. Escape or Continue closes it, and focus then returns to the previous element or the screen's first heading. The Hub name becomes a focusable `h1`.
  - **XP popup:** rendered in `WorkoutLayout`, so it's still showing after the form navigates back. It's `aria-hidden`; a persistent visually-hidden status region announces "Added Bench Press, +30 XP. Session total 30 XP." It respects reduced motion, and its timers are cleaned up on unmount.

## Data
No DB, migration or env changes. `src/features/workout/schema.ts`: `SessionItemSchema` and `StoredSessionSchema` (`version: 1`, owner, items max 100). `src/features/workout/sessionStorage.ts`: key `the-training-meta-workout-session`. `loadSession` returns `[]` and removes the key on throwing storage, bad JSON, a schema failure or an owner mismatch. `saveSession` never throws, and an empty session removes the key.

## UI / flow
1. Add Bench 3×10 → back on `/workout` with a "+30 XP / Bench Press" popup (fade in, fade at 1500 ms, gone at 2000 ms) and a status announcement.
2. Reload → the same session is still there.
3. Finish with level-ups → Hub plus the "⚔️ LEVEL UP! ⚔️" dialog ("🏋️ Bench Press 1 → 2"). Continue or Escape closes it, and focus goes to the Hub name.
4. Finish with no level-ups → straight to the Hub.

## Acceptance criteria
- [x] `loadSession`: a valid value round-trips. Bad JSON, a schema failure, an owner mismatch or throwing storage returns `[]` without throwing, and the corrupt key is removed.
- [x] A reload restores the session, and the first write never clobbers the draft before it's restored.
- [x] A draft with a different owner is discarded on load.
- [x] Finish removes only the logged ids. Items added meanwhile stay, and storage matches.
- [x] Leaving `/workout` mid-save: a success doesn't change the location (and the overlay still shows); a failure shows the error on return with the session intact.
- [x] While finishing, the controls are disabled even on a freshly mounted `WorkoutScreen`.
- [x] Keys and removal use ids: two entries with the same timestamp are removed independently.
- [x] Legacy fixtures still pass `SaveDataSchema`, and no id wrapper leaks into `workoutLog`.
- [x] The XP popup follows its timer sequence, leaves no pending timers after unmount, and the status text is announced.
- [x] Reduced motion: the popup and overlay have no transitions or movement.
- [x] The overlay has dialog semantics, focuses Continue, traps Tab, and closes on Escape or Continue. Focus lands on the Hub `h1` after closing on the Hub.
- [x] CharacterCreatedOverlay moves onto the shared modal, still passes its tests, and now closes on Escape.

## Tests
- Unit: `sessionStorage`, `WorkoutSessionProvider`, `XpPopup` (fake timers), `LevelUpOverlay`, `ModalOverlay`, plus updates to the existing workout and Hub tests.
- E2E: `tests/e2e/workout-feedback.spec.ts`: popup → reload keeps the session → Finish → level-up dialog → Escape → Hub `h1` focused. A reduced-motion variant.

## Tasks
- [x] Add `schema.ts` and `sessionStorage.ts`.
- [x] Add `WorkoutSessionProvider` (items, finishing/finishError, `finish()`, hydration, persistence) and mount it in `App.tsx`.
- [x] Switch to id-based items in `WorkoutLayout`, `ExerciseForm`, `WorkoutScreen` (mounted-ref guard on navigate) and `SessionList`.
- [x] Add `src/components/ModalOverlay.tsx` (show class, initial focus, Tab trap, Escape, inert background, focus restore). Move CharacterCreatedOverlay onto it.
- [x] Add `LevelUpOverlay.tsx`. Make the Hub name an `h1 tabIndex={-1}`.
- [x] Add `XpPopup.tsx` and the status region in `WorkoutLayout`.
- [x] Add reduced-motion rules to `src/app/port.css`.
- [x] Add unit and e2e tests. Tick this checklist.

## Later slices
- Slice 4 `feat/react-port-log-profile`: Quest Log, Profile plus a lose/gain/maintain weight goal, reset with confirm (a reset creates a new `createdAt`, so any leftover draft is discarded), delete `legacy/`. When reset lands, make `finish()`'s synchronous draft write skip if the character changed during the save.
- Supabase slice: a cloud `SaveRepository` with auth and RLS, multi-tab and multi-device conflicts, and whether drafts should sync.
