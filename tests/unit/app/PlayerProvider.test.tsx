import { act, render, screen } from '@testing-library/react';
import { useLayoutEffect } from 'react';
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
      // Layout effect: set during the commit, so it's ready as soon as the DOM shows the new state.
      useLayoutEffect(() => {
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

  it('rejects a second call while the first is saving, and keeps the first result', async () => {
    const repo = repositoryWith(async () => legacySave());
    let finishSave: (() => void) | undefined;
    vi.mocked(repo.save).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishSave = resolve;
        }),
    );
    const getCtx = renderWithContext(repo);
    expect(await screen.findByText('xp 30 streak 1')).toBeInTheDocument();

    const { logWorkout } = getCtx();
    let first: Promise<WorkoutResult> | undefined;
    act(() => {
      first = logWorkout([bench]);
    });
    await expect(logWorkout([bench])).rejects.toThrow('A workout is already being saved');
    await expect(getCtx().logWorkout([bench])).rejects.toThrow('A workout is already being saved');
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(screen.getByText('xp 30 streak 1')).toBeInTheDocument();

    await act(async () => {
      finishSave?.();
      await first;
    });
    const result = await first;
    expect(result?.save.stats.benchPress.xp).toBe(60);
    expect(screen.getByText('xp 60 streak 1')).toBeInTheDocument();
    expect(getCtx().save?.workoutLog).toHaveLength(2);

    // The guard is released once the first save settles.
    await act(async () => {
      await getCtx().logWorkout([bench]);
    });
    expect(screen.getByText('xp 90 streak 1')).toBeInTheDocument();
    expect(repo.save).toHaveBeenCalledTimes(2);
  });

  it('releases the guard after a failed save', async () => {
    const repo = repositoryWith(async () => legacySave());
    vi.mocked(repo.save).mockRejectedValueOnce(new Error('quota exceeded'));
    const getCtx = renderWithContext(repo);
    expect(await screen.findByText('xp 30 streak 1')).toBeInTheDocument();

    await act(async () => {
      await expect(getCtx().logWorkout([bench])).rejects.toThrow('quota exceeded');
    });
    await act(async () => {
      await getCtx().logWorkout([bench]);
    });
    expect(screen.getByText('xp 60 streak 1')).toBeInTheDocument();
  });

  it('builds on the latest save when called twice in sequence (no stale closure)', async () => {
    const repo = repositoryWith(async () => legacySave());
    const getCtx = renderWithContext(repo);
    expect(await screen.findByText('xp 30 streak 1')).toBeInTheDocument();

    // Hold on to the function from before either call, so a closure over the old `save` would show up.
    const { logWorkout } = getCtx();
    let second: WorkoutResult | undefined;
    await act(async () => {
      await logWorkout([bench]);
      second = await logWorkout([bench]);
    });

    expect(second?.save.stats.benchPress.xp).toBe(90);
    expect(second?.save.workoutLog).toHaveLength(3);
    const saves = vi.mocked(repo.save).mock.calls.map(([data]) => data.stats.benchPress.xp);
    expect(saves).toEqual([60, 90]);
    expect(screen.getByText('xp 90 streak 1')).toBeInTheDocument();
  });

  it('rejects when there is no character', async () => {
    const repo = repositoryWith(async () => null);
    const getCtx = renderWithContext(repo);
    expect(await screen.findByText('xp none streak none')).toBeInTheDocument();
    await expect(getCtx().logWorkout([bench])).rejects.toThrow();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
