import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalOverlayProps {
  /** Heading text shown in gold at the top; also the dialog's accessible name. */
  title: ReactNode;
  titleId: string;
  children: ReactNode;
  actionLabel: string;
  /** Called by the action button and by Escape. */
  onClose(): void;
}

/**
 * Full-screen RPG-styled modal (legacy .levelup-overlay look). Portaled to <body>; while open, everything else
 * is inert, focus starts on the action button and Tab can't leave the dialog. On close, focus returns to where
 * it was, or to the current screen's first heading if that element is gone (e.g. after navigating).
 */
export function ModalOverlay({ title, titleId, children, actionLabel, onClose }: ModalOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const [host] = useState(() => document.createElement('div'));
  // Captured once (StrictMode re-runs effects in development, when focus is already inside the dialog).
  const returnFocusTo = useRef<HTMLElement | null | undefined>(undefined);

  // Fade in: add `show` a frame after mount so the CSS opacity transition runs (as legacy did).
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useLayoutEffect(() => {
    if (returnFocusTo.current === undefined) {
      returnFocusTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    document.body.appendChild(host);
    const siblings = [...document.body.children].filter(
      (el): el is HTMLElement => el !== host && el instanceof HTMLElement && !el.hasAttribute('inert'),
    );
    siblings.forEach((el) => el.setAttribute('inert', ''));
    // The portal only joins the document here, so autoFocus would be too early: focus explicitly.
    actionRef.current?.focus();

    return () => {
      siblings.forEach((el) => el.removeAttribute('inert'));
      host.remove();
      restoreFocus(returnFocusTo.current ?? null);
    };
  }, [host]);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && !event.defaultPrevented && !event.isComposing) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function trapTab(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div
      ref={dialogRef}
      className={`levelup-overlay${shown ? ' show' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={trapTab}
    >
      <div className="levelup-modal">
        <div className="levelup-title" id={titleId}>
          {title}
        </div>
        {children}
        <button ref={actionRef} type="button" className="btn-primary levelup-dismiss" onClick={onClose}>
          {actionLabel}
        </button>
      </div>
    </div>,
    host,
  );
}

function restoreFocus(previous: HTMLElement | null) {
  if (previous && previous.isConnected && previous !== document.body) {
    previous.focus();
    return;
  }
  const heading = document.querySelector<HTMLElement>('.screen.active h1, .screen.active h2');
  if (heading) {
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading.focus();
  }
}
