import { createContext, useContext } from 'react';
import type { NewPlayerInput } from '@/lib/game/player';
import type { ExerciseEntry, SaveData, WeightGoal } from '@/lib/game/schema';
import type { WorkoutResult } from '@/lib/game/workout';

export interface PlayerContextValue {
  status: 'loading' | 'ready';
  /** `null` until a character exists. */
  save: SaveData | null;
  createCharacter(input: NewPlayerInput): Promise<SaveData>;
  /** Applies a finished session (XP, levels, log, streak) and saves it. Rejects if saving fails; state is unchanged then. */
  logWorkout(exercises: readonly ExerciseEntry[]): Promise<WorkoutResult>;
  /** Saves a new weight goal. Rejects while a workout is being saved (it would overwrite the change). */
  setWeightGoal(goal: WeightGoal): Promise<void>;
  /** Deletes the character and all progress. Rejects while a workout is being saved (it would restore it). */
  resetCharacter(): Promise<void>;
}

export const PlayerContext = createContext<PlayerContextValue | null>(null);

/** The current save, for screens under <RequireSave> (which guarantees one exists). */
export function useSave(): SaveData {
  const { save } = usePlayer();
  if (!save) throw new Error('useSave must be used under <RequireSave>');
  return save;
}

export function usePlayer(): PlayerContextValue {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return value;
}
