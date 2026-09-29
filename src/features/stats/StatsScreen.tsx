import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSave } from '@/app/playerContext';
import { STAT_ORDER, type StatKey } from '@/lib/game/stats';
import { getTotalLevel } from '@/lib/game/xp';
import { StatDetailPanel } from './StatDetailPanel';
import { getStatView } from './statView';

export function StatsScreen() {
  const save = useSave();
  const [selected, setSelected] = useState<StatKey | null>(null);
  const cellRefs = useRef(new Map<StatKey, HTMLButtonElement>());
  const backgroundRef = useRef<HTMLDivElement>(null);
  const openedFrom = useRef<StatKey | null>(null);

  // While the detail panel is open, the screen behind it is inert: not focusable and hidden from
  // assistive tech. On close, focus returns to the cell that opened it (only possible once it isn't inert).
  // Layout effect so focus moves before paint and never drops to <body> in between.
  useLayoutEffect(() => {
    backgroundRef.current?.toggleAttribute('inert', selected !== null);
    if (selected) {
      openedFrom.current = selected;
    } else if (openedFrom.current) {
      cellRefs.current.get(openedFrom.current)?.focus();
      openedFrom.current = null;
    }
  }, [selected]);

  const closeDetail = useCallback(() => setSelected(null), []);

  const views = STAT_ORDER.map((key) => getStatView(key, save.stats[key], save.player.weightGoal));
  const selectedView = views.find((view) => view.key === selected);

  return (
    <div className="screen active">
      <div ref={backgroundRef}>
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
      </div>

      {selectedView && <StatDetailPanel view={selectedView} onClose={closeDetail} />}
    </div>
  );
}
