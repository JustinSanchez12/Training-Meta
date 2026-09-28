import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LevelUpOverlay } from '@/features/workout/LevelUpOverlay';
import type { LevelUp } from '@/lib/game/workout';

const levelUps: LevelUp[] = [
  { stat: 'benchPress', name: 'Bench Press', icon: '🏋️', previousLevel: 1, newLevel: 2 },
  { stat: 'mileRun', name: 'Mile Run', icon: '🏃', previousLevel: 3, newLevel: 5 },
];

function renderOverlay(onClose = vi.fn()) {
  const user = userEvent.setup();
  render(
    <>
      <main className="screen active">
        <h1 tabIndex={-1}>Aragorn</h1>
      </main>
      <LevelUpOverlay levelUps={levelUps} onClose={onClose} />
    </>,
  );
  return { user, onClose, dialog: screen.getByRole('dialog', { name: '⚔️ LEVEL UP! ⚔️' }) };
}

describe('LevelUpOverlay', () => {
  it('is a modal dialog listing every level-up', () => {
    const { dialog } = renderOverlay();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const items = within(dialog).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('🏋️Bench Press1 → 2');
    expect(items[1]).toHaveTextContent('🏃Mile Run3 → 5');
  });

  it('reads the levels as words and hides the icon and arrow from screen readers', () => {
    const { dialog } = renderOverlay();
    const first = within(dialog).getAllByRole('listitem')[0]!;
    expect(within(first).getByText('level 1 to level 2')).toHaveClass('visually-hidden');
    expect(within(first).getByText('1 → 2')).toHaveAttribute('aria-hidden', 'true');
    expect(within(first).getByText('🏋️')).toHaveAttribute('aria-hidden', 'true');
  });

  it('focuses Continue, and Tab / Shift+Tab stay on it', async () => {
    const { user, dialog } = renderOverlay();
    const continueButton = within(dialog).getByRole('button', { name: 'Continue' });
    expect(continueButton).toHaveFocus();
    await user.tab({ shift: true });
    expect(continueButton).toHaveFocus();
    await user.tab();
    expect(continueButton).toHaveFocus();
  });

  it('marks the rest of the page inert', () => {
    renderOverlay();
    expect(screen.getByRole('heading', { name: 'Aragorn' }).closest('[inert]')).not.toBeNull();
  });

  it('calls onClose from Continue', async () => {
    const { user, dialog, onClose } = renderOverlay();
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose from Escape', async () => {
    const { user, onClose } = renderOverlay();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
