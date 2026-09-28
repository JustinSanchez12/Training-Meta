import { useEffect } from 'react';
import type { StatView } from './statView';

interface StatDetailPanelProps {
  view: StatView;
  onClose(): void;
}

export function StatDetailPanel({ view, onClose }: StatDetailPanelProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const titleId = `stat-detail-title-${view.key}`;

  return (
    <div className="stat-detail-panel active" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="stat-detail-header">
        <button type="button" className="back-btn" onClick={onClose} autoFocus>
          ← Back
        </button>
        <span className="stat-detail-icon" aria-hidden="true">
          {view.icon}
        </span>
        <h2 id={titleId}>{view.name}</h2>
      </div>

      <div className="stat-detail-body">
        <div className="stat-detail-level">
          <span className="label">Level</span>
          <span className="value">{view.level}</span>
        </div>

        <div className="stat-detail-xp-section">
          <div className="xp-bar-large" aria-hidden="true">
            <div className="xp-fill-large" style={{ width: `${view.fillPercent}%` }} />
          </div>
          <div className="xp-text">
            <span className={view.isMax ? 'max-level' : undefined}>{view.xpText}</span>
          </div>
        </div>

        <div className="stat-detail-info">
          <div className="info-row">
            <span>Total XP</span>
            <span>{view.totalXp}</span>
          </div>
          <div className="info-row">
            <span>Category</span>
            <span>{view.categoryLabel}</span>
          </div>
          <div className="info-row">
            <span>XP Rule</span>
            <span>{view.xpRule}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
