import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSave } from '@/app/playerContext';
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
  const save = useSave();
  const { items, removeItem, finishing, finishError, finish } = useWorkoutSession();
  const navigate = useNavigate();

  // Only redirect after a save if the player is still here; if they left mid-save, don't yank them back.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const totalXp = roundXp(items.reduce((sum, item) => sum + item.entry.xpGained, 0));
  const count = items.length;

  async function handleFinish() {
    const result = await finish();
    if (result && mounted.current) navigate('/hub');
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
          {/* Disabled while saving so nothing can be added (or navigated to) mid-save. */}
          <fieldset className="plain-fieldset" disabled={finishing}>
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
          </fieldset>
        </section>

        <section className="workout-section" aria-labelledby="current-session">
          <h3 id="current-session">Current Session</h3>
          <SessionList
            items={items}
            weightUnit={save.player.weightUnit}
            onRemove={removeItem}
            disabled={finishing}
          />
          <div className="session-footer">
            <span className="session-total">
              Total: +{totalXp} XP ({count} {count === 1 ? 'exercise' : 'exercises'})
            </span>
            {finishError && (
              <p className="form-error" role="alert">
                {finishError}
              </p>
            )}
            <button type="button" className="btn-primary btn-finish" onClick={handleFinish} disabled={finishing}>
              ✅ Finish Workout
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
