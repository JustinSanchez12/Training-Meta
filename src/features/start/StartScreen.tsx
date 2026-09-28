import { Navigate, useNavigate } from 'react-router-dom';
import { usePlayer } from '@/app/playerContext';

export function StartScreen() {
  const { save } = usePlayer();
  const navigate = useNavigate();

  if (save) return <Navigate to="/hub" replace />;

  return (
    <div className="screen active">
      <div className="start-content">
        <div className="start-emblem" aria-hidden="true">
          ⚔️
        </div>
        <h1 className="start-title">The Training Meta</h1>
        <p className="start-subtitle">Level Up Your Life</p>
        <div className="start-decorative" aria-hidden="true">
          ━━━ ⚜ ━━━
        </div>
        <button type="button" className="btn-start" onClick={() => navigate('/create')}>
          START
        </button>
        <p className="start-footer">A fitness RPG experience</p>
      </div>
    </div>
  );
}
