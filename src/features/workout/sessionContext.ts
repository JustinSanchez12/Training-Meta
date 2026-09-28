import { useOutletContext } from 'react-router-dom';
import type { ExerciseEntry, SaveData } from '@/lib/game/schema';

/** In-progress session shared by /workout and /workout/:stat through the WorkoutLayout outlet. Memory only. */
export interface WorkoutSession {
  save: SaveData;
  entries: readonly ExerciseEntry[];
  addEntry(entry: ExerciseEntry): void;
  removeEntry(index: number): void;
  /** Removes exactly these entries (by identity), e.g. the ones just saved, keeping anything added meanwhile. */
  removeEntries(entries: readonly ExerciseEntry[]): void;
}

export function useWorkoutSession(): WorkoutSession {
  const context = useOutletContext<WorkoutSession | undefined>();
  if (!context) throw new Error('useWorkoutSession must be used inside <WorkoutLayout>');
  return context;
}
