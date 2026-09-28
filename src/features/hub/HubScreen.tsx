import { Navigate } from 'react-router-dom';
import { usePlayer } from '@/app/playerContext';
import { getOverallLevel, getTotalLevel } from '@/lib/game/xp';

// Panels are disabled until their screens are ported (slices 2–4 in docs/spec.md).
const PANELS = [
  { icon: '📊', title: 'Stats' },
  { icon: '🏋️', title: 'Log Workout' },
  { icon: '📜', title: 'Quest Log' },
  { icon: '👤', title: 'Profile' },
] as const;

export function HubScreen() {
  const { save } = usePlayer();
  if (!save) return <Navigate to="/" replace />;

  const { player, stats, dailyStreak } = save;

  return (
    <div className="screen active">
      <div className="hub-header">
        <div className="hub-player-info">
          <div className="hub-avatar" aria-hidden="true">
            ⚔️
          </div>
          <div>
            <div className="hub-player-name">{player.name}</div>
            <div className="hub-player-level">Level {getOverallLevel(stats)}</div>
          </div>
        </div>
        <div className="hub-meta">
          <span>Total Level: {getTotalLevel(stats)}</span>
          <span>🔥 {dailyStreak} day streak</span>
        </div>
      </div>

      <div className="hub-panels">
        {PANELS.map((panel) => (
          <button key={panel.title} type="button" className="hub-panel" disabled>
            <span className="panel-icon" aria-hidden="true">
              {panel.icon}
            </span>
            <span className="panel-title">{panel.title}</span>
            <span className="panel-desc">Coming soon</span>
          </button>
        ))}
      </div>
    </div>
  );
}
