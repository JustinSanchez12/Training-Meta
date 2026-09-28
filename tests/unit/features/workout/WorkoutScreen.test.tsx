import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SESSION_KEY } from '@/features/workout/sessionStorage';
import { STAT_DEFINITIONS, STAT_ORDER } from '@/lib/game/stats';
import { legacySave } from '../../fixtures/saves';
import { createMemoryRepository, goTo, location, logExercise, pendingSave, renderWorkout } from './renderWorkout';

const finishButton = () => screen.getByRole('button', { name: /finish workout/i });
const sessionSection = () => screen.getByRole('region', { name: /current session/i });
const exerciseButtons = () => within(screen.getByRole('region', { name: /choose exercise/i })).getAllByRole('button');
const removeButtons = () => screen.getAllByRole('button', { name: /^Remove / });
const LEVEL_UP = '⚔️ LEVEL UP! ⚔️';

interface StoredShape {
  items: { id: string; entry: { name: string; timestamp: string } }[];
}
const storedSession = () => JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as StoredShape | null;

describe('WorkoutScreen', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('shows the header, a Hub link, all 12 exercises by category and an empty session', async () => {
    renderWorkout(createMemoryRepository(legacySave()));
    expect(await screen.findByRole('heading', { name: /log workout/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /hub/i })).toHaveAttribute('href', '/hub');

    for (const category of ['Strength', 'Cardio', 'Flexibility', 'Body']) {
      expect(screen.getByRole('heading', { name: category })).toBeInTheDocument();
    }
    const buttons = exerciseButtons();
    expect(buttons.map((b) => b.textContent)).toEqual(
      STAT_ORDER.map((key) => `${STAT_DEFINITIONS[key].icon}${STAT_DEFINITIONS[key].name}`),
    );

    expect(within(sessionSection()).getByText(/no exercises added yet/i)).toBeInTheDocument();
    expect(screen.getByText('Total: +0 XP (0 exercises)')).toBeInTheDocument();
    expect(finishButton()).toBeEnabled();
  });

  it('opens /workout/:stat when an exercise is tapped', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()));
    await user.click(await screen.findByRole('button', { name: /cycling/i }));
    expect(await screen.findByRole('heading', { name: /cycling/i })).toBeInTheDocument();
    expect(location()).toHaveTextContent('/workout/cycling');
  });

  it('keeps the session across /workout → /workout/:stat → back, and totals it', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()));
    await logExercise(user, 'Bench Press', { '^sets': '3', '^reps': '10' });
    expect(location()).toHaveTextContent(/^\/workout$/);
    expect(screen.getByText('Total: +30 XP (1 exercise)')).toBeInTheDocument();

    // Go to a form and leave with Back: the session is still there.
    await user.click(screen.getByRole('button', { name: /mile run/i }));
    await user.click(await screen.findByRole('button', { name: /back/i }));
    expect(await screen.findByText('Total: +30 XP (1 exercise)')).toBeInTheDocument();

    await logExercise(user, 'Mile Run', { distance: '0.3' });
    const session = sessionSection();
    expect(within(session).getByText(/Bench Press — 3×10 @ — lbs/)).toBeInTheDocument();
    expect(within(session).getByText(/Mile Run — 0\.3 miles/)).toBeInTheDocument();
    expect(within(session).getByText('+30 XP')).toBeInTheDocument();
    expect(within(session).getByText('+3 XP')).toBeInTheDocument();
    expect(screen.getByText('Total: +33 XP (2 exercises)')).toBeInTheDocument();
    // The layout's status region announces the latest gain and the running total.
    expect(screen.getByRole('status')).toHaveTextContent('Added Mile Run, +3 XP. Session total 33 XP.');
  });

  it('keeps the session when leaving /workout for another screen and coming back', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()));
    await logExercise(user, 'Bench Press', { '^sets': '3', '^reps': '10' });
    await goTo(user, 'Stats');
    await screen.findByRole('heading', { name: 'Stats stub' });
    await goTo(user, 'Workout');
    expect(await screen.findByText('Total: +30 XP (1 exercise)')).toBeInTheDocument();
  });

  it('removes an entry with its ✕ button and moves focus sensibly', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()));
    await logExercise(user, 'Bench Press', { '^sets': '3', '^reps': '10', '^weight': '135' });
    await logExercise(user, 'Swimming', { laps: '4' });
    expect(screen.getByText('Total: +50 XP (2 exercises)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove Bench Press, 3×10 @ 135 lbs' }));
    expect(screen.queryByRole('button', { name: /^Remove Bench Press/ })).not.toBeInTheDocument();
    const swimming = screen.getByRole('button', { name: 'Remove Swimming, 4 laps' });
    expect(swimming).toHaveFocus();
    expect(screen.getByText('Total: +20 XP (1 exercise)')).toBeInTheDocument();
    expect(storedSession()?.items.map((i) => i.entry.name)).toEqual(['Swimming']);

    await user.click(swimming);
    const empty = within(sessionSection()).getByText(/no exercises added yet/i);
    expect(empty).toHaveFocus();
    expect(screen.getByText('Total: +0 XP (0 exercises)')).toBeInTheDocument();
    // An empty session removes the key.
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('removes two entries with identical timestamps independently', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-28T12:00:00.000Z') });
    const user = renderWorkout(createMemoryRepository(legacySave()));
    await logExercise(user, 'Squat', { '^sets': '1', '^reps': '5' });
    await logExercise(user, 'Squat', { '^sets': '1', '^reps': '5' });
    const stored = storedSession();
    expect(stored?.items).toHaveLength(2);
    expect(stored?.items[0]?.entry.timestamp).toBe(stored?.items[1]?.entry.timestamp);
    expect(stored?.items[0]?.id).not.toBe(stored?.items[1]?.id);

    const twins = screen.getAllByRole('button', { name: 'Remove Squat, 1×5 @ — lbs' });
    expect(twins).toHaveLength(2);
    await user.click(twins[0]!);
    expect(screen.getAllByRole('button', { name: 'Remove Squat, 1×5 @ — lbs' })).toHaveLength(1);
    expect(screen.getByText('Total: +5 XP (1 exercise)')).toBeInTheDocument();
    expect(storedSession()?.items.map((i) => i.id)).toEqual([stored?.items[1]?.id]);
  });

  it('replaces an earlier weigh-in when Weight is logged twice', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave())); // currentWeight 178.5 lbs
    await logExercise(user, 'Weight', { 'current weight': '170' });
    await logExercise(user, 'Weight', { 'current weight': '178' });
    expect(screen.getAllByRole('button', { name: /^Remove Weight/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Remove Weight, 178 lbs' })).toBeInTheDocument();
    expect(within(sessionSection()).getByText(/Weight — 178 lbs/)).toBeInTheDocument();
    expect(screen.getByText('Total: +10 XP (1 exercise)')).toBeInTheDocument();
  });

  it('shows an inline alert and saves nothing when finishing an empty session', async () => {
    const repo = createMemoryRepository(legacySave());
    const user = renderWorkout(repo);
    await user.click(await screen.findByRole('button', { name: /finish workout/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('Add at least one exercise before finishing!');
    expect(repo.save).not.toHaveBeenCalled();
    expect(location()).toHaveTextContent(/^\/workout$/);
  });

  it('clears the empty-session alert once an exercise is added', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()));
    await user.click(await screen.findByRole('button', { name: /finish workout/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await logExercise(user, 'Swimming', { laps: '1' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('finishes: saves XP, streak and weight, clears the session, goes to the Hub and shows the level-ups', async () => {
    const repo = createMemoryRepository(legacySave());
    const user = renderWorkout(repo);
    await logExercise(user, 'Bench Press', { '^sets': '3', '^reps': '10' });
    await logExercise(user, 'Mile Run', { distance: '0.3' });
    await logExercise(user, 'Weight', { 'current weight': '178' });
    expect(storedSession()?.items).toHaveLength(3);
    await user.click(finishButton());

    expect(await screen.findByRole('heading', { name: 'Hub stub' })).toBeInTheDocument();
    expect(location()).toHaveTextContent('/hub');
    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = repo.save.mock.calls[0]?.[0];
    expect(saved?.stats.benchPress).toEqual({ level: 4, xp: 60 });
    expect(saved?.stats.mileRun).toEqual({ level: 1, xp: 6 });
    expect(saved?.stats.weight.xp).toBe(10);
    expect(saved?.player.currentWeight).toBe(178);
    expect(saved?.dailyStreak).toBe(1);
    expect(saved?.lastWorkoutDate).toBe('2026-09-28');
    expect(saved?.workoutLog[0]?.totalXp).toBe(43);
    expect(saved?.workoutLog[0]?.exercises.map((e) => e.stat)).toEqual(['benchPress', 'mileRun', 'weight']);

    // Only Bench Press levels up (30 → 60 XP is level 2 → 4).
    const dialog = await screen.findByRole('dialog', { name: LEVEL_UP });
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(1);
    expect(dialog).toHaveTextContent('Bench Press');
    expect(dialog).toHaveTextContent('level 2 to level 4');
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('goes straight to the Hub with no dialog when nothing levels up', async () => {
    const repo = createMemoryRepository(legacySave());
    const user = renderWorkout(repo);
    await logExercise(user, 'Nutrition', { 'healthy meals': '1' });
    await user.click(finishButton());
    expect(await screen.findByRole('heading', { name: 'Hub stub' })).toBeInTheDocument();
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the session and shows an error when saving fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const repo = createMemoryRepository(legacySave());
    repo.save.mockRejectedValueOnce(new Error('quota exceeded'));
    const user = renderWorkout(repo);
    await logExercise(user, 'Bench Press', { '^sets': '3', '^reps': '10' });
    await user.click(finishButton());

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save your workout. Try again.");
    expect(location()).toHaveTextContent(/^\/workout$/);
    expect(screen.getByRole('button', { name: 'Remove Bench Press, 3×10 @ — lbs' })).toBeInTheDocument();
    expect(screen.getByText('Total: +30 XP (1 exercise)')).toBeInTheDocument();
    expect(storedSession()?.items.map((i) => i.entry.name)).toEqual(['Bench Press']);
    await waitFor(() => expect(finishButton()).toBeEnabled());

    // Retrying succeeds with the same session.
    await user.click(finishButton());
    expect(await screen.findByRole('heading', { name: 'Hub stub' })).toBeInTheDocument();
    expect(await screen.findByRole('dialog', { name: LEVEL_UP })).toBeInTheDocument();
    expect(repo.save).toHaveBeenCalledTimes(2);
    expect(repo.save.mock.calls[1]?.[0].stats.benchPress.xp).toBe(60);
  });

  describe('while Finish is saving', () => {
    it('disables the exercise, ✕ and Finish buttons, then goes to /hub on success', async () => {
      const repo = createMemoryRepository(legacySave());
      const saving = pendingSave(repo);
      const user = renderWorkout(repo);
      await logExercise(user, 'Bench Press', { '^sets': '3', '^reps': '10' });
      await logExercise(user, 'Yoga', { '^sessions': '1' });
      await user.click(finishButton());

      await waitFor(() => expect(finishButton()).toBeDisabled());
      expect(exerciseButtons()).toHaveLength(12);
      for (const button of exerciseButtons()) expect(button).toBeDisabled();
      expect(removeButtons()).toHaveLength(2);
      for (const button of removeButtons()) expect(button).toBeDisabled();

      // Clicks do nothing mid-save.
      await user.click(screen.getByRole('button', { name: /^Remove Yoga/ }));
      await user.click(exerciseButtons()[0]!);
      expect(location()).toHaveTextContent(/^\/workout$/);
      expect(screen.getByText('Total: +40 XP (2 exercises)')).toBeInTheDocument();

      await act(async () => saving().resolve());
      expect(await screen.findByRole('heading', { name: 'Hub stub' })).toBeInTheDocument();
      expect(location()).toHaveTextContent('/hub');
      expect(await screen.findByRole('dialog', { name: LEVEL_UP })).toBeInTheDocument();
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(repo.save.mock.calls[0]?.[0].workoutLog[0]?.exercises.map((e) => e.stat)).toEqual(['benchPress', 'yoga']);
    });

    it('re-enables the buttons and keeps the session after a failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const repo = createMemoryRepository(legacySave());
      const saving = pendingSave(repo);
      const user = renderWorkout(repo);
      await logExercise(user, 'Bench Press', { '^sets': '3', '^reps': '10' });
      await user.click(finishButton());
      await waitFor(() => expect(finishButton()).toBeDisabled());
      for (const button of removeButtons()) expect(button).toBeDisabled();

      await act(async () => saving().reject(new Error('quota exceeded')));
      expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save your workout. Try again.");
      expect(finishButton()).toBeEnabled();
      for (const button of exerciseButtons()) expect(button).toBeEnabled();
      expect(removeButtons()).toHaveLength(1);
      for (const button of removeButtons()) expect(button).toBeEnabled();
      expect(screen.getByText('Total: +30 XP (1 exercise)')).toBeInTheDocument();
      expect(location()).toHaveTextContent(/^\/workout$/);
    });
  });

  describe('leaving /workout mid-save', () => {
    it('a late success leaves the location alone and still shows the level-up dialog', async () => {
      const repo = createMemoryRepository(legacySave());
      const saving = pendingSave(repo);
      const user = renderWorkout(repo);
      await logExercise(user, 'Bench Press', { '^sets': '3', '^reps': '10' });
      await user.click(finishButton());
      await waitFor(() => expect(finishButton()).toBeDisabled());

      await goTo(user, 'Stats');
      expect(await screen.findByRole('heading', { name: 'Stats stub' })).toBeInTheDocument();

      await act(async () => saving().resolve());
      const dialog = await screen.findByRole('dialog', { name: LEVEL_UP });
      expect(dialog).toHaveTextContent('Bench Press');
      expect(location()).toHaveTextContent(/^\/stats$/);
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();

      // Back on /workout, the saved items are gone and there's no error.
      await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
      await goTo(user, 'Workout');
      expect(await screen.findByText('Total: +0 XP (0 exercises)')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('a late success with no level-ups leaves the location alone and shows no dialog', async () => {
      const repo = createMemoryRepository(legacySave());
      const saving = pendingSave(repo);
      const user = renderWorkout(repo);
      await logExercise(user, 'Nutrition', { 'healthy meals': '1' });
      await user.click(finishButton());
      await waitFor(() => expect(finishButton()).toBeDisabled());
      await goTo(user, 'Stats');
      await screen.findByRole('heading', { name: 'Stats stub' });

      await act(async () => saving().resolve());
      await waitFor(() => expect(sessionStorage.getItem(SESSION_KEY)).toBeNull());
      expect(location()).toHaveTextContent(/^\/stats$/);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('a late failure keeps the session and shows the error on return', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const repo = createMemoryRepository(legacySave());
      const saving = pendingSave(repo);
      const user = renderWorkout(repo);
      await logExercise(user, 'Bench Press', { '^sets': '3', '^reps': '10' });
      await logExercise(user, 'Swimming', { laps: '4' });
      await user.click(finishButton());
      await waitFor(() => expect(finishButton()).toBeDisabled());

      await goTo(user, 'Stats');
      await screen.findByRole('heading', { name: 'Stats stub' });
      await act(async () => saving().reject(new Error('quota exceeded')));
      expect(location()).toHaveTextContent(/^\/stats$/);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await goTo(user, 'Workout');
      expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save your workout. Try again.");
      expect(screen.getByText('Total: +50 XP (2 exercises)')).toBeInTheDocument();
      expect(removeButtons()).toHaveLength(2);
      expect(finishButton()).toBeEnabled();
      expect(storedSession()?.items.map((i) => i.entry.name)).toEqual(['Bench Press', 'Swimming']);
    });

    it('a freshly mounted WorkoutScreen has its controls disabled while the save is pending', async () => {
      const repo = createMemoryRepository(legacySave());
      const saving = pendingSave(repo);
      const user = renderWorkout(repo);
      await logExercise(user, 'Bench Press', { '^sets': '3', '^reps': '10' });
      await user.click(finishButton());
      await waitFor(() => expect(finishButton()).toBeDisabled());

      await goTo(user, 'Stats');
      await screen.findByRole('heading', { name: 'Stats stub' });
      await goTo(user, 'Workout');
      await screen.findByRole('heading', { name: /log workout/i });

      expect(finishButton()).toBeDisabled();
      expect(exerciseButtons()).toHaveLength(12);
      for (const button of exerciseButtons()) expect(button).toBeDisabled();
      expect(removeButtons()).toHaveLength(1);
      for (const button of removeButtons()) expect(button).toBeDisabled();

      // The screen that started Finish is gone, so a late success doesn't navigate this one.
      await act(async () => saving().resolve());
      expect(await screen.findByRole('dialog', { name: LEVEL_UP })).toBeInTheDocument();
      expect(location()).toHaveTextContent(/^\/workout$/);
      expect(finishButton()).toBeEnabled();
      expect(screen.getByText('Total: +0 XP (0 exercises)')).toBeInTheDocument();
    });
  });

  it('goes to the Hub from "← Hub"', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()));
    await user.click(await screen.findByRole('link', { name: /← hub/i }));
    expect(await screen.findByRole('heading', { name: 'Hub stub' })).toBeInTheDocument();
  });
});

describe('WorkoutLayout guards', () => {
  it('redirects /workout to Start when there is no save', async () => {
    renderWorkout(createMemoryRepository(null), '/workout');
    expect(await screen.findByRole('heading', { name: 'Start stub' })).toBeInTheDocument();
    expect(location()).toHaveTextContent(/^\/$/);
  });

  it('redirects /workout/squat to Start when there is no save', async () => {
    renderWorkout(createMemoryRepository(null), '/workout/squat');
    expect(await screen.findByRole('heading', { name: 'Start stub' })).toBeInTheDocument();
    expect(location()).toHaveTextContent(/^\/$/);
  });

  it('redirects /workout/notAStat to /workout', async () => {
    renderWorkout(createMemoryRepository(legacySave()), '/workout/notAStat');
    expect(await screen.findByRole('heading', { name: /log workout/i })).toBeInTheDocument();
    expect(location()).toHaveTextContent(/^\/workout$/);
  });
});
