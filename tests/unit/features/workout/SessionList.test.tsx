import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SessionList } from '@/features/workout/SessionList';
import type { ExerciseEntry } from '@/lib/game/schema';

const entries: ExerciseEntry[] = [
  { stat: 'benchPress', name: 'Bench Press', icon: '🏋️', data: { sets: 3, reps: 10, weight: 135 }, xpGained: 30, timestamp: '2026-09-28T12:00:00.000Z' },
  { stat: 'cycling', name: 'Cycling', icon: '🚴', data: { distance: 0.3 }, xpGained: 1.5, timestamp: '2026-09-28T12:00:01.000Z' },
  // Legacy shape: null weight, no change.
  { stat: 'weight', name: 'Weight', icon: '⚖️', data: { currentWeight: null }, xpGained: 0, timestamp: '2026-09-28T12:00:02.000Z' },
];

/** Owns the list state like WorkoutLayout does, so removal re-renders SessionList. */
function Harness({ initial = entries, disabled = false }: { initial?: ExerciseEntry[]; disabled?: boolean }) {
  const [list, setList] = useState(initial);
  return (
    <SessionList
      entries={list}
      weightUnit="lbs"
      disabled={disabled}
      onRemove={(index) => setList((prev) => prev.filter((_, i) => i !== index))}
    />
  );
}

describe('SessionList', () => {
  it('shows the empty message with no entries', () => {
    render(<SessionList entries={[]} weightUnit="lbs" onRemove={vi.fn()} />);
    expect(screen.getByText('No exercises added yet. Select an exercise above.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('lists each entry with its summary, XP and a remove button', () => {
    render(<SessionList entries={entries} weightUnit="kg" onRemove={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('🏋️ Bench Press — 3×10 @ 135 kg');
    expect(items[0]).toHaveTextContent('+30 XP');
    expect(items[1]).toHaveTextContent('🚴 Cycling — 0.3 miles');
    expect(items[1]).toHaveTextContent('+1.5 XP');
    expect(items[2]).toHaveTextContent('⚖️ Weight — — kg');
    expect(items[2]).toHaveTextContent('+0 XP');
  });

  it('labels each ✕ with the entry name and details', () => {
    render(<SessionList entries={entries} weightUnit="lbs" onRemove={vi.fn()} />);
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Remove Bench Press, 3×10 @ 135 lbs',
      'Remove Cycling, 0.3 miles',
      'Remove Weight, — lbs',
    ]);
    for (const button of screen.getAllByRole('button')) expect(button).toHaveTextContent('✕');
  });

  it('tells two entries of the same exercise apart', () => {
    const squats: ExerciseEntry[] = [
      { stat: 'squat', name: 'Squat', icon: '🦵', data: { sets: 1, reps: 5 }, xpGained: 5, timestamp: '2026-09-28T12:00:00.000Z' },
      { stat: 'squat', name: 'Squat', icon: '🦵', data: { sets: 2, reps: 5 }, xpGained: 10, timestamp: '2026-09-28T12:00:01.000Z' },
    ];
    render(<SessionList entries={squats} weightUnit="lbs" onRemove={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Remove Squat, 1×5 @ — lbs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Squat, 2×5 @ — lbs' })).toBeInTheDocument();
  });

  it('calls onRemove with the index of the clicked ✕', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(<SessionList entries={entries} weightUnit="lbs" onRemove={onRemove} />);
    await user.click(screen.getByRole('button', { name: 'Remove Cycling, 0.3 miles' }));
    expect(onRemove).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('disables every ✕ while disabled', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(<SessionList entries={entries} weightUnit="lbs" onRemove={onRemove} disabled />);
    const buttons = screen.getAllByRole('button', { name: /^Remove / });
    expect(buttons).toHaveLength(3);
    for (const button of buttons) expect(button).toBeDisabled();
    await user.click(buttons[0]!);
    expect(onRemove).not.toHaveBeenCalled();
  });

  describe('focus after removing', () => {
    it('moves to the ✕ now at the same position', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole('button', { name: /^Remove Bench Press/ }));
      expect(screen.queryByRole('button', { name: /^Remove Bench Press/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Remove Cycling/ })).toHaveFocus();

      await user.click(screen.getByRole('button', { name: /^Remove Cycling/ }));
      expect(screen.getByRole('button', { name: /^Remove Weight/ })).toHaveFocus();
    });

    it('moves to the new last ✕ when the last entry is removed', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole('button', { name: /^Remove Weight/ }));
      expect(screen.getByRole('button', { name: /^Remove Cycling/ })).toHaveFocus();
    });

    it('moves to the empty message when the list becomes empty', async () => {
      const user = userEvent.setup();
      render(<Harness initial={entries.slice(0, 1)} />);
      await user.click(screen.getByRole('button', { name: /^Remove Bench Press/ }));
      const empty = screen.getByText('No exercises added yet. Select an exercise above.');
      expect(empty).toHaveFocus();
      expect(empty).toHaveAttribute('tabindex', '-1');
    });

    it('does not steal focus when entries change for another reason', () => {
      const { rerender } = render(<SessionList entries={entries} weightUnit="lbs" onRemove={vi.fn()} />);
      rerender(<SessionList entries={entries.slice(1)} weightUnit="lbs" onRemove={vi.fn()} />);
      expect(document.body).toHaveFocus();
    });
  });
});
