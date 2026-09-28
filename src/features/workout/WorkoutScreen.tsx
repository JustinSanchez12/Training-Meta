import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePlayer } from '@/app/playerContext';
import { STAT_DEFINITIONS, STAT_ORDER, formatCategory, type StatCategory, type StatKey } from '@/lib/game/stats';
import { roundXp } from '@/lib/game/workout';
import { useWorkoutSession } from './sessionContext';
import { SessionList } from './SessionList';

// Categories in the order their first stat appears in STAT_ORDER (strength, cardio, flexibility, body).
const CATEGORIES = STAT_ORDER.reduce((groups, key) => {
  const category = STAT_DEFINITIONS[key].category;
  const group = groups.get(category) ?? [];
  groups.set(category, [...group, key]);
  return groups;
}, new Map<StatCategory, StatKey[]>());

export function WorkoutScreen() {
  const { logWorkout } = usePlayer();
  const { save, entries, removeEntry, clear } = useWorkoutSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const totalXp = roundXp(entries.reduce((sum, entry) => sum + entry.xpGained, 0));
  const count = entries.length;

  async function finish() {
    if (count === 0) {
      setError('Add at least one exercise before finishing!');
      return;
    }
    setFinishing(true);
    setError(null);
    try {
      await logWorkout(entries);
      clear();
      navigate('/hub');
    } catch (err) {
      console.error('[Workout] Failed to save workout', err);
      setError("Couldn't save your workout. Try again.");
      setFinishing(false);
    }
  }

  return (
    <div className="screen active">
      <div className="screen-header">
        <Link to="/hub" className="back-btn">
          ← Hub
        </Link>
        <h2>🏋️ Log Workout</h2>
      </div>

      <div className="workout-content">
        <section className="workout-section" aria-labelledby="choose-exercise">
          <h3 id="choose-exercise">Choose Exercise</h3>
          {[...CATEGORIES].map(([category, keys]) => (
            <div key={category} className="exercise-category">
              <h4 className="category-title">{formatCategory(category)}</h4>
              <div className="exercise-grid">
                {keys.map((key) => (
                  <button key={key} type="button" className="exercise-btn" onClick={() => navigate(`/workout/${key}`)}>
                    <span className="ex-icon" aria-hidden="true">
                      {STAT_DEFINITIONS[key].icon}
                    </span>
                    <span className="ex-name">{STAT_DEFINITIONS[key].name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="workout-section" aria-labelledby="current-session">
          <h3 id="current-session">Current Session</h3>
          <SessionList entries={entries} weightUnit={save.player.weightUnit} onRemove={removeEntry} />
          <div className="session-footer">
            <span className="session-total">
              Total: +{totalXp} XP ({count} {count === 1 ? 'exercise' : 'exercises'})
            </span>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button type="button" className="btn-primary btn-finish" onClick={finish} disabled={finishing}>
              ✅ Finish Workout
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
