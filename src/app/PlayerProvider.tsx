import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPlayer, type NewPlayerInput } from '@/lib/game/player';
import type { SaveData } from '@/lib/game/schema';
import { createLocalSaveRepository, type SaveRepository } from '@/lib/storage';
import { PlayerContext, type PlayerContextValue } from './playerContext';

interface PlayerProviderProps {
  children: ReactNode;
  /** Injectable for tests and for the future Supabase repository. */
  repository?: SaveRepository;
}

export function PlayerProvider({ children, repository }: PlayerProviderProps) {
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

  const value = useMemo(() => ({ status, save, createCharacter }), [status, save, createCharacter]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
