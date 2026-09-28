import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SessionList } from '@/features/workout/SessionList';
import type { ExerciseEntry } from '@/lib/game/schema';

const T = '2026-09-28T12:00:00.000Z';
const entries: ExerciseEntry[] = [
  { stat: 'benchPress', name: 'Bench Press', icon: '🏋️', data: { sets: 3, reps: 10, weight: 135 }, xpGained: 30, timestamp: T },
  { stat: 'cycling', name: 'Cycling', icon: '🚴', data: { distance: 0.3 }, xpGained: 1.5, timestamp: T },
  // Legacy shape: {currentWeight} only, no change.
  { stat: 'weight', name: 'Weight', icon: '⚖️', data: { currentWeight: null }, xpGained: 0, timestamp: T },
];

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

  it('calls onRemove with the index of the clicked ✕', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(<SessionList entries={entries} weightUnit="lbs" onRemove={onRemove} />);
    await user.click(screen.getByRole('button', { name: 'Remove Cycling' }));
    expect(onRemove).toHaveBeenCalledExactlyOnceWith(1);
    expect(screen.getByRole('button', { name: 'Remove Cycling' })).toHaveTextContent('✕');
  });
});
