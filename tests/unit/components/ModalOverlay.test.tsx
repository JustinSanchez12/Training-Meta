import { act, render, screen } from '@testing-library/react';
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

describe('ModalOverlay', () => {
  afterEach(() => {
    vi.useRealTimers();
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
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('closes on Escape and returns focus to the element that opened it', async () => {
    const onClose = vi.fn();
    const { user } = await open({ onClose });
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
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
    expect(heading).toHaveFocus();
    // Made programmatically focusable, not tabbable.
    expect(heading).toHaveAttribute('tabindex', '-1');
  });
});
