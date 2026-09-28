import { createContext, useContext } from 'react';
import type { NewPlayerInput } from '@/lib/game/player';
import type { ExerciseEntry, SaveData } from '@/lib/game/schema';
import type { WorkoutResult } from '@/lib/game/workout';

export interface PlayerContextValue {
  status: 'loading' | 'ready';
  /** `null` until a character exists. */
  save: SaveData | null;
  createCharacter(input: NewPlayerInput): Promise<SaveData>;
  /** Applies a finished session (XP, levels, log, streak) and saves it. Rejects if saving fails; state is unchanged then. */
  logWorkout(exercises: readonly ExerciseEntry[]): Promise<WorkoutResult>;
}

export const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return value;
}
