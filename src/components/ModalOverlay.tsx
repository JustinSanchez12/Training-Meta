import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalOverlayProps {
  /** Heading text shown in gold at the top; also the dialog's accessible name. */
  title: ReactNode;
  titleId: string;
  children: ReactNode;
  actionLabel: string;
  /** Called by Escape and the Cancel button (and by the action button unless `onAction` is given). */
  onClose(): void;
  /** Action button handler; defaults to `onClose`. */
  onAction?(): void;
  /** Adds a Cancel button (calls `onClose`) that gets initial focus, for confirm dialogs. */
  cancelLabel?: string;
  /** Styles the action as destructive. */
  danger?: boolean;
  actionDisabled?: boolean;
}

/** Open modals, bottom → top. Only the top one is interactive, handles Escape and owns the inert state. */
const modalStack: HTMLElement[] = [];
/** Elements this module made inert (anything inert for other reasons is left alone). */
const madeInert = new Set<Element>();
/** A deferred focus restore from a modal that just closed; cancelled if another modal opens first. */
let pendingRestore: number | null = null;
const RESTORE_RETRY_FRAMES = 10;

/** Makes everything except the top modal's host inert; with no modal open, restores what we changed. */
function syncInert() {
  madeInert.forEach((el) => el.removeAttribute('inert'));
  madeInert.clear();
  const top = modalStack[modalStack.length - 1];
  if (!top) return;
  for (const el of document.body.children) {
    if (el !== top && !el.hasAttribute('inert')) {
      el.setAttribute('inert', '');
      madeInert.add(el);
    }
  }
}

/**
 * Full-screen RPG-styled modal (legacy .levelup-overlay look). Portaled to <body>; while open, everything else
 * is inert, focus starts on the action button and Tab can't leave the dialog. On close, focus returns to where
 * it was, or to the current screen's first heading if that element is gone (e.g. after navigating).
 */
export function ModalOverlay({
  title,
  titleId,
  children,
  actionLabel,
  onClose,
  onAction,
  cancelLabel,
  danger = false,
  actionDisabled = false,
}: ModalOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // The safe choice gets initial focus: Cancel when there is one, otherwise the single action.
  const initialFocusRef = useRef<HTMLButtonElement>(null);
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
    if (pendingRestore !== null) {
      cancelAnimationFrame(pendingRestore);
      pendingRestore = null;
    }
    document.body.appendChild(host);
    modalStack.push(host);
    syncInert();
    // The portal only joins the document here, so autoFocus would be too early: focus explicitly.
    initialFocusRef.current?.focus();

    return () => {
      const wasTop = modalStack[modalStack.length - 1] === host;
      modalStack.splice(modalStack.indexOf(host), 1);
      host.remove();
      syncInert();
      // A modal closing underneath another must not pull focus out of the one still open.
      if (!wasTop) return;
      const returnTo = returnFocusTo.current ?? null;
      // Deferred to the next frame: when onClose navigates, React Router commits the new screen in a transition
      // that can land after this cleanup (even after a microtask), so resolve the target once it has rendered.
      if (pendingRestore !== null) cancelAnimationFrame(pendingRestore);
      // Retried for a few frames: a redirect can briefly render no screen at all (e.g. a guard's <Navigate>).
      const attempt = (framesLeft: number) => {
        pendingRestore = requestAnimationFrame(() => {
          pendingRestore = null;
          const top = modalStack[modalStack.length - 1];
          // Another modal is still open underneath: move focus into it rather than leaving it on <body>.
          if (top) top.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
          else if (!restoreFocus(returnTo) && framesLeft > 0) attempt(framesLeft - 1);
        });
      };
      attempt(RESTORE_RETRY_FRAMES);
    };
  }, [host]);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
      // Only the top modal closes, so one Escape never dismisses a stack of them.
      if (modalStack[modalStack.length - 1] !== host) return;
      event.preventDefault();
      onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, host]);

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
        {cancelLabel ? (
          <div className="modal-actions">
            <button ref={initialFocusRef} type="button" className="btn-secondary" data-initial-focus onClick={onClose}>
              {cancelLabel}
            </button>
            <button
              type="button"
              className={danger ? 'btn-danger' : 'btn-primary'}
              disabled={actionDisabled}
              onClick={onAction ?? onClose}
            >
              {actionLabel}
            </button>
          </div>
        ) : (
          <button
            ref={initialFocusRef}
            type="button"
            className={`${danger ? 'btn-danger' : 'btn-primary'} levelup-dismiss`}
            data-initial-focus
            disabled={actionDisabled}
            onClick={onAction ?? onClose}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>,
    host,
  );
}

/** Focuses the previous element or the current screen's heading; false if there's nothing to focus yet. */
function restoreFocus(previous: HTMLElement | null): boolean {
  if (previous && previous.isConnected && previous !== document.body) {
    previous.focus();
    return true;
  }
  const heading = document.querySelector<HTMLElement>('.screen.active h1, .screen.active h2');
  if (!heading) return false;
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  heading.focus();
  return true;
}
