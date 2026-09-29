import { Link, Navigate } from 'react-router-dom';
import { usePlayer } from '@/app/playerContext';
import type { WorkoutEntry } from '@/lib/game/schema';
import { formatExerciseData, roundXp } from '@/lib/game/workout';

/** "Mon, Sep 28" in the player's local time (legacy showed the UTC date). */
function formatLogDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Newest first by timestamp, whatever order the saved log is in. */
function newestFirst(log: readonly WorkoutEntry[]): WorkoutEntry[] {
  return [...log].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

export function QuestLogScreen() {
  const { save } = usePlayer();
  if (!save) return <Navigate to="/" replace />;

  const entries = newestFirst(save.workoutLog);
  const unit = save.player.weightUnit;

  return (
    <div className="screen active">
      <div className="screen-header">
        <Link to="/hub" className="back-btn">
          ← Hub
        </Link>
        <h2>📜 Quest Log</h2>
      </div>

      <div className="progress-log">
        {entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              📜
            </div>
            <p>No quests completed yet.</p>
            <p>Begin your journey by logging a workout!</p>
          </div>
        ) : (
          <ul className="quest-list">
            {entries.map((entry) => (
              <li key={entry.id} className="workout-log-card">
                <div className="log-header">
                  <span className="log-date">📅 {formatLogDate(entry.timestamp)}</span>
                  <span className="log-total-xp">+{roundXp(entry.totalXp)} XP</span>
                </div>
                <ul className="log-exercises">
                  {entry.exercises.map((exercise, index) => (
                    <li key={`${exercise.timestamp}-${index}`} className="log-exercise">
                      <span>
                        <span aria-hidden="true">{exercise.icon}</span> {exercise.name}
                      </span>
                      <span className="log-exercise-detail">{formatExerciseData(exercise.stat, exercise.data, unit)}</span>
                      <span className="xp-badge">+{roundXp(exercise.xpGained)} XP</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
