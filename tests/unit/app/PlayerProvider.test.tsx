import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayerProvider } from '@/app/PlayerProvider';
import { usePlayer, type PlayerContextValue } from '@/app/playerContext';
import type { ExerciseEntry } from '@/lib/game/schema';
import type { WorkoutResult } from '@/lib/game/workout';
import type { SaveRepository } from '@/lib/storage';
import { legacySave } from '../fixtures/saves';

function Status() {
  const { status, save } = usePlayer();
  return <p>{status === 'loading' ? 'loading' : (save?.player.name ?? 'no save')}</p>;
}

function repositoryWith(load: SaveRepository['load']): SaveRepository {
  return { load, save: vi.fn(async () => {}), clear: vi.fn(async () => {}) };
}

describe('PlayerProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes the loaded save once ready', async () => {
    render(
      <PlayerProvider repository={repositoryWith(async () => legacySave())}>
        <Status />
      </PlayerProvider>,
    );
    expect(await screen.findByText('Aragorn')).toBeInTheDocument();
  });

  it('treats a failed load as "no save" instead of hanging on loading', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <PlayerProvider repository={repositoryWith(async () => Promise.reject(new Error('boom')))}>
        <Status />
      </PlayerProvider>,
    );
    expect(await screen.findByText('no save')).toBeInTheDocument();
    expect(error).toHaveBeenCalled();
  });
});

describe('PlayerProvider logWorkout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const NOW = new Date(2026, 8, 28, 23, 30);
  const bench: ExerciseEntry = {
    stat: 'benchPress',
    name: 'Bench Press',
    icon: '🏋️',
    data: { sets: 3, reps: 10 },
    xpGained: 30,
    timestamp: NOW.toISOString(),
  };

  function renderWithContext(repository: SaveRepository) {
    const captured: { current: PlayerContextValue | null } = { current: null };
    function Capture() {
      const value = usePlayer();
      useEffect(() => {
        captured.current = value;
      });
      const { status, save } = value;
      return (
        <p>
          {status === 'loading' ? 'loading' : `xp ${save?.stats.benchPress.xp ?? 'none'} streak ${save?.dailyStreak ?? 'none'}`}
        </p>
      );
    }
    render(
      <PlayerProvider repository={repository} now={() => NOW}>
        <Capture />
      </PlayerProvider>,
    );
    return () => {
      if (!captured.current) throw new Error('context not captured');
      return captured.current;
    };
  }

  it('applies the workout with the injected clock, saves it and updates state', async () => {
    const repo = repositoryWith(async () => ({ ...legacySave(), dailyStreak: 2, lastWorkoutDate: '2026-09-27' }));
    const getCtx = renderWithContext(repo);
    expect(await screen.findByText('xp 30 streak 2')).toBeInTheDocument();

    let result: WorkoutResult | undefined;
    await act(async () => {
      result = await getCtx().logWorkout([bench]);
    });

    expect(await screen.findByText('xp 60 streak 3')).toBeInTheDocument();
    expect(repo.save).toHaveBeenCalledTimes(1);
    const saved = vi.mocked(repo.save).mock.calls[0]?.[0];
    expect(saved).toBe(result?.save);
    expect(saved?.lastWorkoutDate).toBe('2026-09-28');
    expect(saved?.workoutLog[0]).toMatchObject({ date: '2026-09-28', timestamp: NOW.toISOString(), totalXp: 30 });
    expect(result?.levelUps).toEqual([
      { stat: 'benchPress', name: 'Bench Press', icon: '🏋️', previousLevel: 2, newLevel: 4 },
    ]);
  });

  it('rejects and leaves state unchanged when saving fails', async () => {
    const repo = repositoryWith(async () => legacySave());
    vi.mocked(repo.save).mockRejectedValueOnce(new Error('quota exceeded'));
    const getCtx = renderWithContext(repo);
    expect(await screen.findByText('xp 30 streak 1')).toBeInTheDocument();

    await act(async () => {
      await expect(getCtx().logWorkout([bench])).rejects.toThrow('quota exceeded');
    });
    expect(screen.getByText('xp 30 streak 1')).toBeInTheDocument();
    expect(getCtx().save?.workoutLog).toHaveLength(1);
  });

  it('rejects when there is no character', async () => {
    const repo = repositoryWith(async () => null);
    const getCtx = renderWithContext(repo);
    expect(await screen.findByText('xp none streak none')).toBeInTheDocument();
    await expect(getCtx().logWorkout([bench])).rejects.toThrow();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
