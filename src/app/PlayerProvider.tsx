import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPlayer, type NewPlayerInput } from '@/lib/game/player';
import type { ExerciseEntry, SaveData, WeightGoal } from '@/lib/game/schema';
import { applyWorkout } from '@/lib/game/workout';
import { createLocalSaveRepository, type SaveRepository } from '@/lib/storage';
import { PlayerContext, type PlayerContextValue } from './playerContext';

const defaultNow = () => new Date();

interface PlayerProviderProps {
  children: ReactNode;
  /** Injectable for tests and for the future Supabase repository. */
  repository?: SaveRepository;
  /** Injectable clock for tests (streak dates, timestamps). */
  now?: () => Date;
}

export function PlayerProvider({ children, repository, now = defaultNow }: PlayerProviderProps) {
  const repo = useMemo(() => repository ?? createLocalSaveRepository(), [repository]);
  const [status, setStatus] = useState<PlayerContextValue['status']>('loading');
  const [save, setSaveState] = useState<SaveData | null>(null);
  // Latest save, readable from async actions without waiting for a re-render (avoids stale-closure overwrites).
  const saveRef = useRef<SaveData | null>(null);
  const setSave = useCallback((next: SaveData | null) => {
    saveRef.current = next;
    setSaveState(next);
  }, []);
  // One write at a time: each action builds on saveRef, so overlapping writes would undo each other.
  const writeInFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    repo
      .load()
      .catch((error: unknown) => {
        console.error('[Player] Failed to load save', error);
        return null;
      })
      .then((loaded) => {
        if (cancelled) return;
        setSave(loaded);
        setStatus('ready');
      });
    return () => {
      cancelled = true;
    };
  }, [repo, setSave]);

  const createCharacter = useCallback(
    async (input: NewPlayerInput) => {
      const created = createPlayer(input);
      await repo.save(created);
      setSave(created);
      return created;
    },
    [repo, setSave],
  );

  const logWorkout = useCallback(
    async (exercises: readonly ExerciseEntry[]) => {
      const current = saveRef.current;
      if (!current) throw new Error('Cannot log a workout without a character');
      // Two overlapping calls would both build on the same save and the second write would erase the first.
      if (writeInFlight.current) throw new Error('A workout is already being saved');
      writeInFlight.current = true;
      try {
        const result = applyWorkout(current, exercises, now());
        await repo.save(result.save);
        setSave(result.save);
        return result;
      } finally {
        writeInFlight.current = false;
      }
    },
    [repo, now, setSave],
  );

  const setWeightGoal = useCallback(
    async (goal: WeightGoal) => {
      const current = saveRef.current;
      if (!current) throw new Error('Cannot set a weight goal without a character');
      if (writeInFlight.current) throw new Error('A workout is being saved; try again in a moment');
      writeInFlight.current = true;
      try {
        const next: SaveData = { ...current, player: { ...current.player, weightGoal: goal } };
        await repo.save(next);
        setSave(next);
      } finally {
        writeInFlight.current = false;
      }
    },
    [repo, setSave],
  );

  const resetCharacter = useCallback(async () => {
    if (writeInFlight.current) throw new Error('A workout is being saved; try again in a moment');
    writeInFlight.current = true;
    try {
      await repo.clear();
      setSave(null);
    } finally {
      writeInFlight.current = false;
    }
  }, [repo, setSave]);

  const value = useMemo(
    () => ({ status, save, createCharacter, logWorkout, setWeightGoal, resetCharacter }),
    [status, save, createCharacter, logWorkout, setWeightGoal, resetCharacter],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
