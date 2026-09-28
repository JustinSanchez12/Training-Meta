import { useLayoutEffect, useRef } from 'react';
import type { WeightUnit } from '@/lib/game/schema';
import { formatExerciseData } from '@/lib/game/workout';
import type { SessionItem } from './schema';

interface SessionListProps {
  items: readonly SessionItem[];
  weightUnit: WeightUnit;
  onRemove(id: string): void;
  disabled?: boolean;
}

export function SessionList({ items, weightUnit, onRemove, disabled = false }: SessionListProps) {
  const removeButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const emptyMessage = useRef<HTMLParagraphElement>(null);
  const focusAfterRemove = useRef<number | null>(null);

  // The removed ✕ button had focus; move it to the next entry's ✕ (or the empty message) instead of <body>.
  useLayoutEffect(() => {
    const index = focusAfterRemove.current;
    if (index === null) return;
    focusAfterRemove.current = null;
    if (items.length === 0) emptyMessage.current?.focus();
    else removeButtons.current[Math.min(index, items.length - 1)]?.focus();
  }, [items]);

  if (items.length === 0) {
    return (
      <p ref={emptyMessage} className="session-empty" tabIndex={-1}>
        No exercises added yet. Select an exercise above.
      </p>
    );
  }

  return (
    <ul className="session-list">
      {items.map(({ id, entry }, index) => {
        const details = formatExerciseData(entry.stat, entry.data, weightUnit);
        return (
          <li key={id} className="session-exercise-item">
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
                onRemove(id);
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
