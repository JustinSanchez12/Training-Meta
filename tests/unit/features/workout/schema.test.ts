import { describe, expect, it } from 'vitest';
import { SessionItemSchema, StoredSessionSchema } from '@/features/workout/schema';
import { SaveDataSchema, type ExerciseEntry } from '@/lib/game/schema';
import { applyWorkout } from '@/lib/game/workout';
import { legacySave } from '../../fixtures/saves';

const entry: ExerciseEntry = {
  stat: 'benchPress',
  name: 'Bench Press',
  icon: '🏋️',
  data: { sets: 3, reps: 10 },
  xpGained: 30,
  timestamp: '2026-09-28T12:00:00.000Z',
};

describe('SessionItemSchema', () => {
  it('accepts an id plus an entry', () => {
    expect(SessionItemSchema.safeParse({ id: 'abc', entry }).success).toBe(true);
  });

  it('rejects an empty id, a missing entry or a bare entry', () => {
    expect(SessionItemSchema.safeParse({ id: '', entry }).success).toBe(false);
    expect(SessionItemSchema.safeParse({ id: 'abc' }).success).toBe(false);
    expect(SessionItemSchema.safeParse(entry).success).toBe(false);
  });

  it('accepts legacy-shaped entry data (nulls, string numbers)', () => {
    const legacyExercise = legacySave().workoutLog[0]!.exercises[1]!;
    expect(SessionItemSchema.safeParse({ id: 'x', entry: legacyExercise }).success).toBe(true);
  });
});

describe('StoredSessionSchema', () => {
  it('requires version 1, an owner and at most 100 items', () => {
    const items = [{ id: 'a', entry }];
    expect(StoredSessionSchema.safeParse({ version: 1, owner: 'o', items }).success).toBe(true);
    expect(StoredSessionSchema.safeParse({ version: 1, owner: 'o', items: [] }).success).toBe(true);
    expect(StoredSessionSchema.safeParse({ version: 2, owner: 'o', items }).success).toBe(false);
    expect(StoredSessionSchema.safeParse({ version: 1, items }).success).toBe(false);
    const tooMany = Array.from({ length: 101 }, (_, i) => ({ id: String(i), entry }));
    expect(StoredSessionSchema.safeParse({ version: 1, owner: 'o', items: tooMany }).success).toBe(false);
  });
});

describe('saved workouts stay id-free', () => {
  it('legacy fixtures still pass SaveDataSchema', () => {
    expect(SaveDataSchema.safeParse(legacySave()).success).toBe(true);
  });

  it('a workout built from session items has no id wrapper and validates', () => {
    const items = [
      { id: 'a', entry },
      { id: 'b', entry: { ...entry, stat: 'mileRun' as const, name: 'Mile Run', data: { distance: 1 }, xpGained: 10 } },
    ];
    const { save } = applyWorkout(legacySave(), items.map((i) => i.entry), new Date(2026, 8, 28, 12));
    const logged = save.workoutLog[0]!;
    for (const exercise of logged.exercises) {
      expect(exercise).not.toHaveProperty('id');
      expect(exercise).not.toHaveProperty('entry');
    }
    expect(logged.exercises).toEqual(items.map((i) => i.entry));
    expect(SaveDataSchema.safeParse(save).success).toBe(true);
  });
});
