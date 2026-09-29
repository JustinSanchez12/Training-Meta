import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SaveData, WorkoutEntry } from '@/lib/game/schema';
import { legacySave } from '../../fixtures/saves';
import { createMemoryRepository, location, renderWorkout } from '../workout/renderWorkout';

const localDate = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

function workout(id: string, at: Date, exercises: WorkoutEntry['exercises'], totalXp: number): WorkoutEntry {
  return { id, date: '', timestamp: at.toISOString(), exercises, totalXp };
}

function saveWith(workoutLog: WorkoutEntry[]): SaveData {
  return { ...legacySave(), workoutLog };
}

describe('QuestLogScreen', () => {
  it('lists workouts newest first by timestamp, with local dates, total XP and formatted exercises', async () => {
    // Late evening local time: the UTC date can differ, the displayed date must not.
    const older = new Date(2026, 8, 27, 23, 30);
    const newer = new Date(2026, 8, 28, 23, 30);
    const at = older.toISOString();
    const save = saveWith([
      workout('a', older, [{ stat: 'benchPress', name: 'Bench Press', icon: '🏋️', data: { sets: 3, reps: 10, weight: 135 }, xpGained: 30, timestamp: at }], 30),
      workout(
        'b',
        newer,
        [
          { stat: 'mileRun', name: 'Mile Run', icon: '🏃', data: { distance: 0.3 }, xpGained: 3.0000000000000004, timestamp: at },
          // Legacy entry with a null value.
          { stat: 'weight', name: 'Weight', icon: '⚖️', data: { currentWeight: null }, xpGained: 0, timestamp: at },
        ],
        3.0000000000000004,
      ),
    ]);
    renderWorkout(createMemoryRepository(save), '/log');

    expect(await screen.findByRole('heading', { name: '📜 Quest Log' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Hub' })).toHaveAttribute('href', '/hub');
    // One card per workout, identified by its date line, in display order.
    const cards = screen.getAllByText(/^📅/).map((date) => date.closest('li'));
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent(`📅 ${localDate(newer)}`);
    expect(cards[0]).toHaveTextContent('+3 XP');
    expect(cards[0]).toHaveTextContent('0.3 miles');
    expect(cards[0]).toHaveTextContent('— lbs');
    expect(cards[1]).toHaveTextContent(`📅 ${localDate(older)}`);
    expect(cards[1]).toHaveTextContent('3×10 @ 135 lbs');
    expect(cards[1]).toHaveTextContent('+30 XP');
  });

  it('shows the empty state with no workouts', async () => {
    renderWorkout(createMemoryRepository(saveWith([])), '/log');
    expect(await screen.findByText('No quests completed yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('redirects to Start without a save', async () => {
    renderWorkout(createMemoryRepository(null), '/log');
    expect(await screen.findByRole('heading', { name: 'Start stub' })).toBeInTheDocument();
    expect(location()).toHaveTextContent(/^\/$/);
  });
});
