import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ScreenHeaderProps {
  /** Heading text, including its emoji (e.g. "⚔️ Stats"). */
  title: string;
  /** Optional right-aligned text (e.g. "Total Level: 13"). */
  meta?: ReactNode;
}

/** "← Hub" link + screen title. The h2 is the focus fallback after dialogs close, so keep it here. */
export function ScreenHeader({ title, meta }: ScreenHeaderProps) {
  return (
    <div className="screen-header">
      <Link to="/hub" className="back-btn">
        ← Hub
      </Link>
      <h2>{title}</h2>
      {meta !== undefined && <span className="header-meta">{meta}</span>}
    </div>
  );
}
