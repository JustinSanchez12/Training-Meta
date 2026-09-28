import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModalOverlay } from '@/components/ModalOverlay';

interface HarnessProps {
  /** Unmount the opener while the dialog is open (like navigating away). */
  removeOpener?: boolean;
  /** Extra focusable content inside the dialog. */
  withLink?: boolean;
  onClose?: () => void;
}

function Harness({ removeOpener = false, withLink = false, onClose }: HarnessProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="screen active">
        <h2>Screen heading</h2>
        {!(removeOpener && open) && (
          <button type="button" onClick={() => setOpen(true)}>
            Open
          </button>
        )}
        <button type="button">Behind</button>
      </div>
      {open && (
        <ModalOverlay
          title="⚔️ TITLE ⚔️"
          titleId="test-title"
          actionLabel="Continue"
          onClose={() => {
            onClose?.();
            setOpen(false);
          }}
        >
          <p>Body text</p>
          {withLink && <a href="#more">More</a>}
        </ModalOverlay>
      )}
    </>
  );
}

async function open(props: HarnessProps = {}) {
  const user = userEvent.setup();
  const result = render(<Harness {...props} />);
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const dialog = screen.getByRole('dialog', { name: '⚔️ TITLE ⚔️' });
  return { user, dialog, container: result.container };
}

const continueButton = () => screen.getByRole('button', { name: 'Continue' });

/** Two modals mounted together: A first (bottom), then B (top). Each closes itself via its onClose. */
function Stack({ onCloseA, onCloseB }: { onCloseA: () => void; onCloseB: () => void }) {
  const [a, setA] = useState(true);
  const [b, setB] = useState(true);
  return (
    <>
      <div className="screen active">
        <h2>Stack screen</h2>
      </div>
      {a && (
        <ModalOverlay title="Modal A" titleId="modal-a" actionLabel="Close A" onClose={() => { onCloseA(); setA(false); }}>
          <p>A body</p>
        </ModalOverlay>
      )}
      {b && (
        <ModalOverlay title="Modal B" titleId="modal-b" actionLabel="Close B" onClose={() => { onCloseB(); setB(false); }}>
          <p>B body</p>
        </ModalOverlay>
      )}
    </>
  );
}

/** The portal host of a dialog (the direct <body> child the module keeps interactive). */
const hostOf = (dialog: HTMLElement) => dialog.parentElement!;

describe('ModalOverlay', () => {
  afterEach(() => {
    vi.useRealTimers();
    // The modal stack is module-level: unmount everything and prove nothing leaked into the next case.
    cleanup();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(0);
    expect(document.querySelectorAll('[inert]')).toHaveLength(0);
  });

  it('is a modal dialog named by its title, portaled to <body>', async () => {
    const { dialog, container } = await open();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'test-title');
    expect(document.getElementById('test-title')).toHaveTextContent('⚔️ TITLE ⚔️');
    expect(dialog).toHaveTextContent('Body text');
    expect(container).not.toContainElement(dialog);
    expect(dialog.parentElement?.parentElement).toBe(document.body);
  });

  it('adds the show class on the next frame', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
    render(
      <ModalOverlay title="T" titleId="t" actionLabel="Continue" onClose={vi.fn()}>
        <p>Body</p>
      </ModalOverlay>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('levelup-overlay', { exact: true });
    act(() => vi.advanceTimersToNextFrame());
    expect(dialog).toHaveClass('levelup-overlay show', { exact: true });
  });

  it('focuses the action button on open', async () => {
    await open();
    expect(continueButton()).toHaveFocus();
  });

  it('traps Tab and Shift+Tab on the only focusable element', async () => {
    const { user } = await open();
    await user.tab();
    expect(continueButton()).toHaveFocus();
    await user.tab({ shift: true });
    expect(continueButton()).toHaveFocus();
    await user.tab();
    expect(continueButton()).toHaveFocus();
  });

  it('wraps Tab between the first and last focusable elements', async () => {
    const { user } = await open({ withLink: true });
    const link = screen.getByRole('link', { name: 'More' });
    expect(continueButton()).toHaveFocus();
    // Continue is last: Tab wraps to the first (the link).
    await user.tab();
    expect(link).toHaveFocus();
    // The link is first: Shift+Tab wraps to the last (Continue).
    await user.tab({ shift: true });
    expect(continueButton()).toHaveFocus();
  });

  it('marks everything else in <body> inert while open, and removes it on close', async () => {
    const { user, dialog, container } = await open();
    const host = dialog.parentElement;
    expect(container).toHaveAttribute('inert');
    expect(host).not.toHaveAttribute('inert');
    for (const child of document.body.children) {
      if (child !== host) expect(child).toHaveAttribute('inert');
    }

    await user.click(continueButton());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[inert]')).toHaveLength(0);
    expect(host?.isConnected).toBe(false);
  });

  it('leaves an element that was already inert inert after closing', async () => {
    const other = document.createElement('div');
    other.setAttribute('inert', '');
    document.body.appendChild(other);
    try {
      const { user } = await open();
      await user.keyboard('{Escape}');
      expect(other).toHaveAttribute('inert');
    } finally {
      other.remove();
    }
  });

  it('closes on Continue and returns focus to the element that opened it', async () => {
    const onClose = vi.fn();
    const { user } = await open({ onClose });
    await user.click(continueButton());
    expect(onClose).toHaveBeenCalledTimes(1);
    // Restored on the next frame (after a navigation's transition would have committed).
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus());
  });

  it('closes on Escape and returns focus to the element that opened it', async () => {
    const onClose = vi.fn();
    const { user } = await open({ onClose });
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus());
  });

  it('ignores an Escape that something else already handled', async () => {
    const onClose = vi.fn();
    render(
      <ModalOverlay title="T" titleId="t" actionLabel="Continue" onClose={onClose}>
        <p>Body</p>
      </ModalOverlay>,
    );
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    event.preventDefault();
    act(() => {
      document.dispatchEvent(event);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('falls back to the active screen heading when the previous element is gone', async () => {
    const { user } = await open({ removeOpener: true });
    expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    const heading = screen.getByRole('heading', { name: 'Screen heading' });
    await waitFor(() => expect(heading).toHaveFocus());
    // Made programmatically focusable, not tabbable.
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  describe('stacked modals', () => {
    function renderStack() {
      const onCloseA = vi.fn();
      const onCloseB = vi.fn();
      const { container } = render(<Stack onCloseA={onCloseA} onCloseB={onCloseB} />);
      const a = screen.getByRole('dialog', { name: 'Modal A' });
      const b = screen.getByRole('dialog', { name: 'Modal B' });
      return { onCloseA, onCloseB, container, a, b };
    }

    it('only the top modal is interactive: the page and the lower modal are inert', () => {
      const { container, a, b } = renderStack();
      expect(container).toHaveAttribute('inert');
      expect(hostOf(a)).toHaveAttribute('inert');
      expect(hostOf(b)).not.toHaveAttribute('inert');
      expect(within(b).getByRole('button', { name: 'Close B' })).toHaveFocus();
    });

    it('Escape closes only the top modal (B); A stays open and the page stays inert', async () => {
      const user = userEvent.setup();
      const { onCloseA, onCloseB, container, a } = renderStack();
      await user.keyboard('{Escape}');

      expect(onCloseB).toHaveBeenCalledTimes(1);
      expect(onCloseA).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog', { name: 'Modal B' })).not.toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Modal A' })).toBe(a);
      // A is now the top: it's interactive, the page behind it still isn't.
      expect(hostOf(a)).not.toHaveAttribute('inert');
      expect(container).toHaveAttribute('inert');

      // The next Escape closes A.
      await user.keyboard('{Escape}');
      expect(onCloseA).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.querySelectorAll('[inert]')).toHaveLength(0);
    });

    it('closing the lower modal (A) first keeps the page inert and focus inside B', async () => {
      const { onCloseA, container, b } = renderStack();
      const closeB = within(b).getByRole('button', { name: 'Close B' });
      expect(closeB).toHaveFocus();

      // A is inert, so this can only happen programmatically (e.g. its owner unmounts it).
      fireEvent.click(screen.getByRole('button', { name: 'Close A' }));
      expect(onCloseA).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog', { name: 'Modal A' })).not.toBeInTheDocument();

      expect(container).toHaveAttribute('inert');
      expect(hostOf(b)).not.toHaveAttribute('inert');
      // Let any deferred focus restore run (it's queued for the next frame): it must not pull focus out of B.
      await act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
      expect(closeB).toHaveFocus();
    });

    it('after both close, no inert is left and pre-existing inert elements stay inert', async () => {
      const already = document.createElement('div');
      already.setAttribute('inert', '');
      document.body.appendChild(already);
      try {
        const user = userEvent.setup();
        const { container } = renderStack();
        expect(container).toHaveAttribute('inert');
        await user.keyboard('{Escape}');
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(container).not.toHaveAttribute('inert');
        expect(already).toHaveAttribute('inert');
        expect([...document.querySelectorAll('[inert]')]).toEqual([already]);
        // With the stack empty, focus falls back to the screen heading.
        await waitFor(() => expect(screen.getByRole('heading', { name: 'Stack screen' })).toHaveFocus());
      } finally {
        already.remove();
      }
    });
  });
});
