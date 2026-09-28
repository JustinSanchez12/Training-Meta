import { act, render, screen } from '@testing-library/react';
import { useLayoutEffect } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayerProvider } from '@/app/PlayerProvider';
import { WorkoutLayout } from '@/features/workout/WorkoutLayout';
import { useWorkoutSession, type WorkoutSession } from '@/features/workout/sessionContext';
import type { ExerciseEntry } from '@/lib/game/schema';
import { legacySave } from '../../fixtures/saves';
import { createMemoryRepository } from './renderWorkout';
import { WaitForLoad } from './TestHarness';

function Bare() {
  useWorkoutSession();
  return null;
}

function squat(timestamp: string): ExerciseEntry {
  return { stat: 'squat', name: 'Squat', icon: '🦵', data: { sets: 1, reps: 5 }, xpGained: 5, timestamp };
}

function renderSession() {
  const captured: { current: WorkoutSession | null } = { current: null };
  function Probe() {
    const session = useWorkoutSession();
    // Layout effect: set during the commit, so it's ready as soon as the DOM shows the new state.
    useLayoutEffect(() => {
      captured.current = session;
    });
    return <p>{session.entries.length} entries</p>;
  }
  render(
    <PlayerProvider repository={createMemoryRepository(legacySave())}>
      <MemoryRouter initialEntries={['/workout']}>
        <WaitForLoad>
          <Routes>
            <Route path="/workout" element={<WorkoutLayout />}>
              <Route index element={<Probe />} />
            </Route>
          </Routes>
        </WaitForLoad>
      </MemoryRouter>
    </PlayerProvider>,
  );
  return () => {
    if (!captured.current) throw new Error('session not captured');
    return captured.current;
  };
}

describe('useWorkoutSession', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws a clear error outside WorkoutLayout', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // React rethrows render errors; stop jsdom from also printing them as uncaught.
    const swallow = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', swallow);
    try {
      expect(() =>
        render(
          <MemoryRouter>
            <Bare />
          </MemoryRouter>,
        ),
      ).toThrow('useWorkoutSession must be used inside <WorkoutLayout>');
    } finally {
      window.removeEventListener('error', swallow);
    }
  });

  it('removeEntries removes exactly the given entries by identity, keeping ones added meanwhile', async () => {
    const session = renderSession();
    await screen.findByText('0 entries');

    const saved = squat('2026-09-28T12:00:00.000Z');
    // Same values as `saved` but a different object, e.g. added while the save was in flight.
    const addedMeanwhile = squat('2026-09-28T12:00:00.000Z');
    act(() => session().addEntry(saved));
    act(() => session().addEntry(addedMeanwhile));
    expect(screen.getByText('2 entries')).toBeInTheDocument();

    act(() => session().removeEntries([saved]));
    expect(screen.getByText('1 entries')).toBeInTheDocument();
    expect(session().entries).toHaveLength(1);
    expect(session().entries[0]).toBe(addedMeanwhile);

    // Removing something not in the session is a no-op.
    act(() => session().removeEntries([squat('2026-09-28T12:00:00.000Z')]));
    expect(session().entries).toEqual([addedMeanwhile]);
  });
});
