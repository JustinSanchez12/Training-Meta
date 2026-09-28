import { createContext, useContext } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ExerciseEntry } from '@/lib/game/schema';
import type { WorkoutResult } from '@/lib/game/workout';
import type { SessionItem } from './schema';

/**
 * The in-progress workout. Owned by WorkoutSessionProvider above the routes, so it survives leaving /workout
 * (including mid-save), and persisted to this tab's sessionStorage so it survives a reload.
 */
export interface WorkoutSession {
  items: readonly SessionItem[];
  /** Adds an entry (a new weigh-in replaces an earlier one) and returns the new item and session total. */
  addEntry(entry: ExerciseEntry): { item: SessionItem; totalXp: number };
  removeItem(id: string): void;
  finishing: boolean;
  finishError: string | null;
  /** Saves the session. Resolves to the result, or null when empty or failed (then `finishError` is set). */
  finish(): Promise<WorkoutResult | null>;
}

export const WorkoutSessionContext = createContext<WorkoutSession | null>(null);

export function useWorkoutSession(): WorkoutSession {
  const context = useContext(WorkoutSessionContext);
  if (!context) throw new Error('useWorkoutSession must be used inside <WorkoutSessionProvider>');
  return context;
}

/** Provided by WorkoutLayout's outlet: shows the "+N XP" popup and announces it. */
export interface XpFeedback {
  showXpGain(item: SessionItem, totalXp: number): void;
}

export function useXpFeedback(): XpFeedback {
  const context = useOutletContext<XpFeedback | undefined>();
  if (!context) throw new Error('useXpFeedback must be used inside <WorkoutLayout>');
  return context;
}
