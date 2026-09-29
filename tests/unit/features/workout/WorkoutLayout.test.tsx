import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { legacySave } from '../../fixtures/saves';
import { goTo, logExercise, renderWorkout } from './renderWorkout';
import { createMemoryRepository } from '../../helpers/memoryRepository';

const popup = () => document.querySelector('.xp-popup');

describe('WorkoutLayout XP feedback', () => {
  beforeEach(() => {
    // shouldAdvanceTime keeps user-event's internal delays working while we still control the popup's timers.
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'],
      shouldAdvanceTime: true,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the popup after logging, keeps it on /workout, and removes it after 2000 ms', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()));
    await logExercise(user, 'Bench Press', { '^sets': '3', '^reps': '10' });

    expect(popup()).toHaveTextContent('+30 XPBench Press');
    expect(popup()).toHaveAttribute('aria-hidden', 'true');
    act(() => vi.advanceTimersToNextFrame());
    expect(screen.getByRole('status')).toHaveTextContent('Added Bench Press, +30 XP. Session total 30 XP.');

    act(() => vi.advanceTimersByTime(2000));
    expect(popup()).toBeNull();
    // The announcement stays (it's a persistent live region, not tied to the popup).
    expect(screen.getByRole('status')).toHaveTextContent('Added Bench Press, +30 XP. Session total 30 XP.');
  });

  it('restarts the popup for the next item and updates the announcement', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()));
    await logExercise(user, 'Bench Press', { '^sets': '3', '^reps': '10' });
    await logExercise(user, 'Swimming', { laps: '4' });

    expect(document.querySelectorAll('.xp-popup')).toHaveLength(1);
    expect(popup()).toHaveTextContent('+20 XPSwimming');
    act(() => vi.advanceTimersToNextFrame());
    expect(screen.getByRole('status')).toHaveTextContent('Added Swimming, +20 XP. Session total 50 XP.');
  });

  it('re-announces identical text: two 0 XP weigh-ins in a row clear the status, then set it again', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave())); // currentWeight 178.5 lbs
    await screen.findByRole('heading', { name: /log workout/i });
    const status = screen.getByRole('status');
    const seen: string[] = [];
    const observer = new MutationObserver(() => seen.push(status.textContent ?? ''));
    observer.observe(status, { childList: true, characterData: true, subtree: true });
    const text = 'Added Weight, +0 XP. Session total 0 XP.';
    try {
      await logExercise(user, 'Weight', { 'current weight': '181' });
      act(() => vi.advanceTimersToNextFrame());
      expect(status).toHaveTextContent(text);

      await logExercise(user, 'Weight', { 'current weight': '181' });
      act(() => vi.advanceTimersToNextFrame());
      expect(status).toHaveTextContent(text);
      // The second, identical announcement went through an empty state, so screen readers hear it again.
      await Promise.resolve();
      expect(seen).toEqual([text, '', text]);
    } finally {
      observer.disconnect();
    }
    // The replaced weigh-in leaves one entry.
    expect(screen.getByText('Total: +0 XP (1 exercise)')).toBeInTheDocument();
  });

  it('leaves no popup timers behind after leaving /workout', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()));
    await logExercise(user, 'Bench Press', { '^sets': '3', '^reps': '10' });
    expect(popup()).not.toBeNull();

    await goTo(user, 'Stats');
    await screen.findByRole('heading', { name: 'Stats stub' });
    expect(popup()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
