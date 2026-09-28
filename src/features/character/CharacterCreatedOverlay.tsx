import { useEffect, useState } from 'react';

interface CharacterCreatedOverlayProps {
  name: string;
  onEnterHub(): void;
}

export function CharacterCreatedOverlay({ name, onEnterHub }: CharacterCreatedOverlayProps) {
  // Add `show` a frame after mount so the CSS opacity transition runs (same as legacy).
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className={`levelup-overlay${shown ? ' show' : ''}`} role="dialog" aria-modal="true" aria-labelledby="character-created-title">
      <div className="levelup-modal">
        <div className="levelup-title" id="character-created-title">
          ⚔️ CHARACTER CREATED ⚔️
        </div>
        <div className="levelup-item">
          <span className="levelup-icon">🎉</span>
          <span className="levelup-name">Welcome, {name}!</span>
          <span className="levelup-levels">All stats: Level 1</span>
        </div>
        <p className="overlay-note">Your adventure begins now.</p>
        <button type="button" className="btn-primary levelup-dismiss" onClick={onEnterHub} autoFocus>
          Enter the Hub
        </button>
      </div>
    </div>
  );
}
