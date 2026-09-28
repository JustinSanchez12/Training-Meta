import { Link, Navigate } from 'react-router-dom';
import { usePlayer } from '@/app/playerContext';
import { getOverallLevel, getTotalLevel } from '@/lib/game/xp';

interface Panel {
  icon: string;
  title: string;
  desc: string;
  /** Route to open; panels without one are not ported yet (see docs/spec.md) and render disabled. */
  to?: string;
}

const PANELS: Panel[] = [
  { icon: '📊', title: 'Stats', desc: 'View your skills', to: '/stats' },
  { icon: '🏋️', title: 'Log Workout', desc: 'Train & earn XP', to: '/workout' },
  { icon: '📜', title: 'Quest Log', desc: 'Workout history' },
  { icon: '👤', title: 'Profile', desc: 'Your character' },
];

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
            <h1 className="hub-player-name" tabIndex={-1}>
              {player.name}
            </h1>
            <div className="hub-player-level">Level {getOverallLevel(stats)}</div>
          </div>
        </div>
        <div className="hub-meta">
          <span>Total Level: {getTotalLevel(stats)}</span>
          <span>🔥 {dailyStreak} day streak</span>
        </div>
      </div>

      <div className="hub-panels">
        {PANELS.map((panel) => {
          const content = (
            <>
              <span className="panel-icon" aria-hidden="true">
                {panel.icon}
              </span>
              <span className="panel-title">{panel.title}</span>
              <span className="panel-desc">{panel.to ? panel.desc : 'Coming soon'}</span>
            </>
          );
          return panel.to ? (
            <Link key={panel.title} to={panel.to} className="hub-panel">
              {content}
            </Link>
          ) : (
            <button key={panel.title} type="button" className="hub-panel" disabled>
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
