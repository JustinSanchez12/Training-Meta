import { useLayoutEffect, useRef } from 'react';
import type { ExerciseEntry, WeightUnit } from '@/lib/game/schema';
import { formatExerciseData } from '@/lib/game/workout';

interface SessionListProps {
  entries: readonly ExerciseEntry[];
  weightUnit: WeightUnit;
  onRemove(index: number): void;
  disabled?: boolean;
}

export function SessionList({ entries, weightUnit, onRemove, disabled = false }: SessionListProps) {
  const removeButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const emptyMessage = useRef<HTMLParagraphElement>(null);
  const focusAfterRemove = useRef<number | null>(null);

  // The removed ✕ button had focus; move it to the next entry's ✕ (or the empty message) instead of <body>.
  useLayoutEffect(() => {
    const index = focusAfterRemove.current;
    if (index === null) return;
    focusAfterRemove.current = null;
    if (entries.length === 0) emptyMessage.current?.focus();
    else removeButtons.current[Math.min(index, entries.length - 1)]?.focus();
  }, [entries]);

  if (entries.length === 0) {
    return (
      <p ref={emptyMessage} className="session-empty" tabIndex={-1}>
        No exercises added yet. Select an exercise above.
      </p>
    );
  }

  return (
    <ul className="session-list">
      {entries.map((entry, index) => {
        const details = formatExerciseData(entry.stat, entry.data, weightUnit);
        return (
          <li key={entry.timestamp} className="session-exercise-item">
            <span className="session-ex-info">
              {entry.icon} {entry.name} — {details}
            </span>
            <span className="session-ex-xp">+{entry.xpGained} XP</span>
            <button
              ref={(el) => {
                removeButtons.current[index] = el;
              }}
              type="button"
              className="session-remove-btn"
              aria-label={`Remove ${entry.name}, ${details}`}
              disabled={disabled}
              onClick={() => {
                focusAfterRemove.current = index;
                onRemove(index);
              }}
            >
              ✕
            </button>
          </li>
        );
      })}
    </ul>
  );
}
