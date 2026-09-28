import { createContext, useContext } from 'react';
import type { NewPlayerInput } from '@/lib/game/player';
import type { SaveData } from '@/lib/game/schema';

export interface PlayerContextValue {
  status: 'loading' | 'ready';
  /** `null` until a character exists. */
  save: SaveData | null;
  createCharacter(input: NewPlayerInput): Promise<SaveData>;
}

export const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return value;
}
