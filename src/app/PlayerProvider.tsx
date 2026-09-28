import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPlayer, type NewPlayerInput } from '@/lib/game/player';
import type { ExerciseEntry, SaveData } from '@/lib/game/schema';
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
  const [save, setSave] = useState<SaveData | null>(null);

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
  }, [repo]);

  const createCharacter = useCallback(
    async (input: NewPlayerInput) => {
      const created = createPlayer(input);
      await repo.save(created);
      setSave(created);
      return created;
    },
    [repo],
  );

  const logWorkout = useCallback(
    async (exercises: readonly ExerciseEntry[]) => {
      if (!save) throw new Error('Cannot log a workout without a character');
      const result = applyWorkout(save, exercises, now());
      await repo.save(result.save);
      setSave(result.save);
      return result;
    },
    [repo, save, now],
  );

  const value = useMemo(
    () => ({ status, save, createCharacter, logWorkout }),
    [status, save, createCharacter, logWorkout],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
