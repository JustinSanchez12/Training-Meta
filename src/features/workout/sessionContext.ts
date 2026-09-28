import { useOutletContext } from 'react-router-dom';
import type { ExerciseEntry, SaveData } from '@/lib/game/schema';

/** In-progress session shared by /workout and /workout/:stat through the WorkoutLayout outlet. Memory only. */
export interface WorkoutSession {
  save: SaveData;
  entries: readonly ExerciseEntry[];
  addEntry(entry: ExerciseEntry): void;
  removeEntry(index: number): void;
  clear(): void;
}

export function useWorkoutSession(): WorkoutSession {
  return useOutletContext<WorkoutSession>();
}
