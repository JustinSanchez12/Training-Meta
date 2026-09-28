import type { ExerciseEntry, WeightUnit } from '@/lib/game/schema';
import { formatExerciseData } from '@/lib/game/workout';

interface SessionListProps {
  entries: readonly ExerciseEntry[];
  weightUnit: WeightUnit;
  onRemove(index: number): void;
}

export function SessionList({ entries, weightUnit, onRemove }: SessionListProps) {
  if (entries.length === 0) {
    return <p className="session-empty">No exercises added yet. Select an exercise above.</p>;
  }

  return (
    <ul className="session-list">
      {entries.map((entry, index) => (
        <li key={`${entry.timestamp}-${index}`} className="session-exercise-item">
          <span className="session-ex-info">
            {entry.icon} {entry.name} — {formatExerciseData(entry.stat, entry.data, weightUnit)}
          </span>
          <span className="session-ex-xp">+{entry.xpGained} XP</span>
          <button type="button" className="session-remove-btn" aria-label={`Remove ${entry.name}`} onClick={() => onRemove(index)}>
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
