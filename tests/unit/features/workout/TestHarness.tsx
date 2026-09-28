import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { usePlayer } from '@/app/playerContext';

/** Mirrors App: render nothing until the save has loaded. */
export function WaitForLoad({ children }: { children: ReactNode }) {
  const { status } = usePlayer();
  return status === 'loading' ? null : <>{children}</>;
}

export function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}
