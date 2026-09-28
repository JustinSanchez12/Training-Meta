import { useCallback, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { usePlayer } from '@/app/playerContext';
import { STAT_ORDER, type StatKey } from '@/lib/game/stats';
import { getTotalLevel } from '@/lib/game/xp';
import { StatDetailPanel } from './StatDetailPanel';
import { getStatView } from './statView';

export function StatsScreen() {
  const { save } = usePlayer();
  const [selected, setSelected] = useState<StatKey | null>(null);
  const cellRefs = useRef(new Map<StatKey, HTMLButtonElement>());

  const closeDetail = useCallback(() => {
    // Return focus to the cell that opened the panel.
    if (selected) cellRefs.current.get(selected)?.focus();
    setSelected(null);
  }, [selected]);

  if (!save) return <Navigate to="/" replace />;

  const views = STAT_ORDER.map((key) => getStatView(key, save.stats[key]));
  const selectedView = views.find((view) => view.key === selected);

  return (
    <div className="screen active">
      <div className="screen-header">
        <Link to="/hub" className="back-btn">
          ← Hub
        </Link>
        <h2>⚔️ Stats</h2>
        <span className="header-meta">Total Level: {getTotalLevel(save.stats)}</span>
      </div>

      <div className="stats-grid-container">
        <div className="stats-grid">
          {views.map((view) => (
            <button
              key={view.key}
              ref={(el) => {
                if (el) cellRefs.current.set(view.key, el);
                else cellRefs.current.delete(view.key);
              }}
              type="button"
              className="stat-cell"
              aria-label={`${view.name}, level ${view.level}`}
              onClick={() => setSelected(view.key)}
            >
              <span className="stat-icon" aria-hidden="true">
                {view.icon}
              </span>
              <span className="stat-name">{view.name}</span>
              <span className="stat-level">{view.level}</span>
              <span className="stat-xp-bar" aria-hidden="true">
                <span className="stat-xp-fill" style={{ width: `${view.fillPercent}%` }} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedView && <StatDetailPanel view={selectedView} onClose={closeDetail} />}
    </div>
  );
}
