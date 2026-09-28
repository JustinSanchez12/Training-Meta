import { useCallback, useMemo, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { usePlayer } from '@/app/playerContext';
import type { SessionItem } from './schema';
import type { XpFeedback } from './sessionContext';
import { XpPopup } from './XpPopup';

/**
 * Parent route for /workout/*: guards on a save and hosts the "+N XP" popup, so it keeps playing after the
 * exercise form navigates back to /workout. The session itself lives in WorkoutSessionProvider.
 */
export function WorkoutLayout() {
  const { save } = usePlayer();
  const [popup, setPopup] = useState<SessionItem | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const showXpGain = useCallback((item: SessionItem, totalXp: number) => {
    setPopup(item);
    setAnnouncement(`Added ${item.entry.name}, +${item.entry.xpGained} XP. Session total ${totalXp} XP.`);
  }, []);
  const hidePopup = useCallback(() => setPopup(null), []);
  const feedback = useMemo<XpFeedback>(() => ({ showXpGain }), [showXpGain]);

  if (!save) return <Navigate to="/" replace />;

  return (
    <>
      <Outlet context={feedback} />
      {popup && <XpPopup key={popup.id} xp={popup.entry.xpGained} name={popup.entry.name} onDone={hidePopup} />}
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
