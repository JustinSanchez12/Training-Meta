import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import type { SessionItem } from './schema';
import type { XpFeedback } from './sessionContext';
import { XpPopup } from './XpPopup';

/**
 * Parent route for /workout/* (under RequireSave): hosts the "+N XP" popup, so it keeps playing after the
 * exercise form navigates back to /workout. The session itself lives in WorkoutSessionProvider.
 */
export function WorkoutLayout() {
  const [popup, setPopup] = useState<SessionItem | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const announceFrame = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (announceFrame.current !== null) cancelAnimationFrame(announceFrame.current);
    },
    [],
  );

  const showXpGain = useCallback((item: SessionItem, totalXp: number) => {
    setPopup(item);
    // Clear, then set on the next frame, so identical text (e.g. a replaced 0 XP weigh-in) is announced again.
    setAnnouncement('');
    if (announceFrame.current !== null) cancelAnimationFrame(announceFrame.current);
    const text = `Added ${item.entry.name}, +${item.entry.xpGained} XP. Session total ${totalXp} XP.`;
    announceFrame.current = requestAnimationFrame(() => {
      announceFrame.current = null;
      setAnnouncement(text);
    });
  }, []);
  const hidePopup = useCallback(() => setPopup(null), []);
  const feedback = useMemo<XpFeedback>(() => ({ showXpGain }), [showXpGain]);

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
