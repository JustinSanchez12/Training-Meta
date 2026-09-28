import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STAT_DEFINITIONS, STAT_ORDER } from '@/lib/game/stats';
import { legacySave } from '../../fixtures/saves';
import { createMemoryRepository, location, logExercise, renderWorkout } from './renderWorkout';

const finishButton = () => screen.getByRole('button', { name: /finish workout/i });
const sessionSection = () => screen.getByRole('region', { name: /current session/i });

describe('WorkoutScreen', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the header, a Hub link, all 12 exercises by category and an empty session', async () => {
    renderWorkout(createMemoryRepository(legacySave()));
    expect(await screen.findByRole('heading', { name: /log workout/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /hub/i })).toHaveAttribute('href', '/hub');

    for (const category of ['Strength', 'Cardio', 'Flexibility', 'Body']) {
      expect(screen.getByRole('heading', { name: category })).toBeInTheDocument();
    }
    const chooser = screen.getByRole('region', { name: /choose exercise/i });
    const buttons = within(chooser).getAllByRole('button');
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
  });

  it('removes an entry with its ✕ button', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()));
    await logExercise(user, 'Bench Press', { '^sets': '3', '^reps': '10' });
    await logExercise(user, 'Swimming', { laps: '4' });
    expect(screen.getByText('Total: +50 XP (2 exercises)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove Bench Press' }));
    expect(screen.queryByRole('button', { name: 'Remove Bench Press' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Swimming' })).toBeInTheDocument();
    expect(screen.getByText('Total: +20 XP (1 exercise)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove Swimming' }));
    expect(within(sessionSection()).getByText(/no exercises added yet/i)).toBeInTheDocument();
  });

  it('replaces an earlier weigh-in when Weight is logged twice', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave())); // currentWeight 178.5 lbs
    await logExercise(user, 'Weight', { 'current weight': '170' });
    await logExercise(user, 'Weight', { 'current weight': '178' });
    expect(screen.getAllByRole('button', { name: 'Remove Weight' })).toHaveLength(1);
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

  it('finishes: saves XP, streak and weight, clears the session and goes to the Hub', async () => {
    const repo = createMemoryRepository(legacySave());
    const user = renderWorkout(repo);
    await logExercise(user, 'Bench Press', { '^sets': '3', '^reps': '10' });
    await logExercise(user, 'Mile Run', { distance: '0.3' });
    await logExercise(user, 'Weight', { 'current weight': '178' });
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
    expect(screen.getByRole('button', { name: 'Remove Bench Press' })).toBeInTheDocument();
    expect(screen.getByText('Total: +30 XP (1 exercise)')).toBeInTheDocument();
    await waitFor(() => expect(finishButton()).toBeEnabled());

    // Retrying succeeds with the same session.
    await user.click(finishButton());
    expect(await screen.findByRole('heading', { name: 'Hub stub' })).toBeInTheDocument();
    expect(repo.save).toHaveBeenCalledTimes(2);
    expect(repo.save.mock.calls[1]?.[0].stats.benchPress.xp).toBe(60);
  });

  it('goes to the Hub from "← Hub"', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()));
    await user.click(await screen.findByRole('link', { name: /hub/i }));
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
