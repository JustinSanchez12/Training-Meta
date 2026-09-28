import { useCallback, useMemo, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { usePlayer } from '@/app/playerContext';
import type { ExerciseEntry } from '@/lib/game/schema';
import { addToSession } from '@/lib/game/workout';
import type { WorkoutSession } from './sessionContext';

/** Parent route for /workout/*: guards on a save and owns the session so it survives moving between screens. */
export function WorkoutLayout() {
  const { save } = usePlayer();
  const [entries, setEntries] = useState<readonly ExerciseEntry[]>([]);

  const addEntry = useCallback((entry: ExerciseEntry) => setEntries((prev) => addToSession(prev, entry)), []);
  const removeEntry = useCallback((index: number) => setEntries((prev) => prev.filter((_, i) => i !== index)), []);
  const removeEntries = useCallback(
    (done: readonly ExerciseEntry[]) => setEntries((prev) => prev.filter((entry) => !done.includes(entry))),
    [],
  );

  const context = useMemo<WorkoutSession | null>(
    () => (save ? { save, entries, addEntry, removeEntry, removeEntries } : null),
    [save, entries, addEntry, removeEntry, removeEntries],
  );

  if (!context) return <Navigate to="/" replace />;
  return <Outlet context={context} />;
}
