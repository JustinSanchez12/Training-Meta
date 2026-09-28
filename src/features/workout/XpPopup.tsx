import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export const XP_POPUP_FADE_MS = 1500;
export const XP_POPUP_DONE_MS = 2000;

interface XpPopupProps {
  xp: number;
  name: string;
  onDone(): void;
}

/**
 * The legacy "+N XP" popup: fades in, starts fading at 1.5 s, gone at 2 s. Purely visual (aria-hidden);
 * WorkoutLayout announces the same information in a status region. Key it by entry id to restart it.
 */
export function XpPopup({ xp, name, onDone }: XpPopupProps) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'fade'>('enter');
  const onDoneRef = useRef(onDone);
  useLayoutEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => setPhase('show'));
    const fade = setTimeout(() => setPhase('fade'), XP_POPUP_FADE_MS);
    const done = setTimeout(() => onDoneRef.current(), XP_POPUP_DONE_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, []);

  const className = phase === 'enter' ? 'xp-popup' : phase === 'show' ? 'xp-popup show' : 'xp-popup show fade';
  return (
    <div className={className} aria-hidden="true">
      +{xp} XP
      <small>{name}</small>
    </div>
  );
}
