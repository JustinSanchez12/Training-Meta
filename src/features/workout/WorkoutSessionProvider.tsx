import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePlayer } from '@/app/playerContext';
import type { ExerciseEntry } from '@/lib/game/schema';
import { addToSession, roundXp, type LevelUp } from '@/lib/game/workout';
import { LevelUpOverlay } from './LevelUpOverlay';
import type { SessionItem } from './schema';
import { WorkoutSessionContext, type WorkoutSession } from './sessionContext';
import { getSessionStorage, loadSession, newItemId, saveSession } from './sessionStorage';

const EMPTY_SESSION_ERROR = 'Add at least one exercise before finishing!';
const SAVE_FAILED_ERROR = "Couldn't save your workout. Try again.";

interface WorkoutSessionProviderProps {
  children: ReactNode;
  /** Injectable for tests; defaults to this tab's sessionStorage (null when unavailable). */
  storage?: Storage | null;
}

interface SessionState {
  /** The character the items belong to (save.player.createdAt), or null with no character. */
  owner: string | null;
  items: readonly SessionItem[];
}

export function WorkoutSessionProvider({ children, storage }: WorkoutSessionProviderProps) {
  const { save, logWorkout } = usePlayer();
  const [store] = useState(() => (storage === undefined ? getSessionStorage() : storage));
  const owner = save?.player.createdAt ?? null;

  // Hydrate synchronously on first render (and whenever the character changes), so the persist effect
  // below can never write an empty session over a stored draft before it has been restored.
  const [state, setState] = useState<SessionState>(() => ({ owner, items: owner ? loadSession(store, owner) : [] }));
  let current = state;
  if (state.owner !== owner) {
    current = { owner, items: owner ? loadSession(store, owner) : [] };
    setState(current);
  }
  const { items } = current;

  const itemsRef = useRef(items);
  useLayoutEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (owner) saveSession(store, owner, items);
  }, [store, owner, items]);

  const [finishing, setFinishing] = useState(false);
  const finishingRef = useRef(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [levelUps, setLevelUps] = useState<readonly LevelUp[]>([]);

  const setItems = useCallback((next: readonly SessionItem[]) => {
    itemsRef.current = next;
    setState((prev) => ({ ...prev, items: next }));
  }, []);

  const addEntry = useCallback(
    (entry: ExerciseEntry) => {
      // The form disables itself while saving; a weigh-in added now would replace the one being saved.
      if (finishingRef.current) throw new Error('Cannot add an exercise while the workout is being saved');
      const item: SessionItem = { id: newItemId(), entry };
      const next = addToSession(itemsRef.current, item, (i) => i.entry);
      setItems(next);
      setFinishError(null);
      return { item, totalXp: roundXp(next.reduce((sum, i) => sum + i.entry.xpGained, 0)) };
    },
    [setItems],
  );

  const removeItem = useCallback((id: string) => setItems(itemsRef.current.filter((i) => i.id !== id)), [setItems]);

  const finish = useCallback(async () => {
    if (finishingRef.current) return null;
    const logged = itemsRef.current;
    if (logged.length === 0) {
      setFinishError(EMPTY_SESSION_ERROR);
      return null;
    }

    finishingRef.current = true;
    setFinishing(true);
    setFinishError(null);
    try {
      const result = await logWorkout(logged.map((i) => i.entry));
      // Remove exactly what was saved; the ids make this safe even if the list changed meanwhile.
      const saved = new Set(logged.map((i) => i.id));
      const remaining = itemsRef.current.filter((i) => !saved.has(i.id));
      setItems(remaining);
      // Persist now, not in the next effect: a reload in between would restore (and re-log) a saved workout.
      if (owner) saveSession(store, owner, remaining);
      if (result.levelUps.length > 0) setLevelUps(result.levelUps);
      return result;
    } catch (error) {
      console.error('[Workout] Failed to save workout', error);
      setFinishError(SAVE_FAILED_ERROR);
      return null;
    } finally {
      finishingRef.current = false;
      setFinishing(false);
    }
  }, [logWorkout, setItems, owner, store]);

  const closeLevelUps = useCallback(() => setLevelUps([]), []);

  const value = useMemo<WorkoutSession>(
    () => ({ items, addEntry, removeItem, finishing, finishError, finish }),
    [items, addEntry, removeItem, finishing, finishError, finish],
  );

  return (
    <WorkoutSessionContext.Provider value={value}>
      {children}
      {levelUps.length > 0 && <LevelUpOverlay levelUps={levelUps} onClose={closeLevelUps} />}
    </WorkoutSessionContext.Provider>
  );
}
