import { describe, expect, it } from 'vitest';
import {
  DistanceInputSchema,
  EXERCISE_INPUT_SCHEMAS,
  LapsInputSchema,
  MealInputSchema,
  RepsInputSchema,
  SessionInputSchema,
  WeightInputSchema,
} from '@/lib/game/exercise';

describe('EXERCISE_INPUT_SCHEMAS', () => {
  it('has a schema for every XP type', () => {
    expect(Object.keys(EXERCISE_INPUT_SCHEMAS).sort()).toEqual(
      ['distance', 'laps', 'meal', 'reps', 'session', 'weight'].sort(),
    );
    expect(EXERCISE_INPUT_SCHEMAS.reps).toBe(RepsInputSchema);
    expect(EXERCISE_INPUT_SCHEMAS.weight).toBe(WeightInputSchema);
  });
});

describe('RepsInputSchema', () => {
  it('coerces form strings to numbers', () => {
    const result = RepsInputSchema.safeParse({ sets: '3', reps: '10', weight: '135' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ sets: 3, reps: 10, weight: 135 });
  });

  it('accepts a missing or blank lift weight', () => {
    expect(RepsInputSchema.safeParse({ sets: '3', reps: '10' }).data).toEqual({ sets: 3, reps: 10 });
    const blank = RepsInputSchema.safeParse({ sets: '3', reps: '10', weight: '  ' });
    expect(blank.success).toBe(true);
    expect(blank.data?.weight).toBeUndefined();
  });

  it('accepts the boundaries', () => {
    expect(RepsInputSchema.safeParse({ sets: '1', reps: '1', weight: '0' }).success).toBe(true);
    expect(RepsInputSchema.safeParse({ sets: '100', reps: '1000', weight: '2000' }).success).toBe(true);
  });

  it.each([
    ['0 sets', { sets: '0', reps: '10' }, 'sets', 'Sets must be between 1 and 100.'],
    ['101 sets', { sets: '101', reps: '10' }, 'sets', 'Sets must be between 1 and 100.'],
    ['1.5 reps', { sets: '3', reps: '1.5' }, 'reps', 'Reps must be a whole number.'],
    ['1001 reps', { sets: '3', reps: '1001' }, 'reps', 'Reps must be between 1 and 1000.'],
    ['NaN sets', { sets: 'abc', reps: '10' }, 'sets', 'Please enter sets.'],
    ['empty sets', { sets: '', reps: '10' }, 'sets', 'Please enter sets.'],
    ['missing reps', { sets: '3' }, 'reps', 'Please enter reps.'],
    ['negative weight', { sets: '3', reps: '10', weight: '-5' }, 'weight', 'Weight must be between 0 and 2000.'],
    ['2001 weight', { sets: '3', reps: '10', weight: '2001' }, 'weight', 'Weight must be between 0 and 2000.'],
  ])('rejects %s', (_label, input, field, message) => {
    const result = RepsInputSchema.safeParse(input);
    expect(result.success).toBe(false);
    const issue = result.error?.issues.find((i) => i.path[0] === field);
    expect(issue?.message).toBe(message);
  });

  it('rejects a raw NaN number', () => {
    expect(RepsInputSchema.safeParse({ sets: Number.NaN, reps: 10 }).success).toBe(false);
  });
});

describe('DistanceInputSchema', () => {
  it('accepts 0.1 to 200 miles', () => {
    expect(DistanceInputSchema.safeParse({ distance: '0.1' }).data).toEqual({ distance: 0.1 });
    expect(DistanceInputSchema.safeParse({ distance: '0.3' }).data).toEqual({ distance: 0.3 });
    expect(DistanceInputSchema.safeParse({ distance: '200' }).success).toBe(true);
  });

  it.each([['0.05'], ['0'], ['200.1'], [''], ['NaN'], ['one']])('rejects %j', (distance) => {
    expect(DistanceInputSchema.safeParse({ distance }).success).toBe(false);
  });
});

describe('LapsInputSchema', () => {
  it('accepts whole laps from 1 to 1000', () => {
    expect(LapsInputSchema.safeParse({ laps: '4' }).data).toEqual({ laps: 4 });
    expect(LapsInputSchema.safeParse({ laps: '1000' }).success).toBe(true);
  });

  it.each([['0'], ['1001'], ['2.5'], ['']])('rejects %j', (laps) => {
    expect(LapsInputSchema.safeParse({ laps }).success).toBe(false);
  });
});

describe('SessionInputSchema', () => {
  it('accepts sessions with an optional duration', () => {
    expect(SessionInputSchema.safeParse({ sessions: '2' }).data).toEqual({ sessions: 2 });
    expect(SessionInputSchema.safeParse({ sessions: '2', duration: '' }).data).toEqual({ sessions: 2 });
    expect(SessionInputSchema.safeParse({ sessions: '1', duration: '45' }).data).toEqual({ sessions: 1, duration: 45 });
  });

  it.each([
    [{ sessions: '0' }],
    [{ sessions: '21' }],
    [{ sessions: '' }],
    [{ sessions: '1', duration: '0' }],
    [{ sessions: '1', duration: '1441' }],
    [{ sessions: '1', duration: '30.5' }],
  ])('rejects %j', (input) => {
    expect(SessionInputSchema.safeParse(input).success).toBe(false);
  });
});

describe('WeightInputSchema', () => {
  it('accepts 20 to 1500', () => {
    expect(WeightInputSchema.safeParse({ currentWeight: '179.5' }).data).toEqual({ currentWeight: 179.5 });
    expect(WeightInputSchema.safeParse({ currentWeight: '20' }).success).toBe(true);
    expect(WeightInputSchema.safeParse({ currentWeight: '1500' }).success).toBe(true);
  });

  it.each([['19.9'], ['1500.1'], [''], ['heavy']])('rejects %j', (currentWeight) => {
    expect(WeightInputSchema.safeParse({ currentWeight }).success).toBe(false);
  });

  it('asks for a weight when empty', () => {
    expect(WeightInputSchema.safeParse({ currentWeight: '' }).error?.issues[0]?.message).toBe(
      'Please enter current weight.',
    );
  });
});

describe('MealInputSchema', () => {
  it('accepts meals with an optional trimmed description', () => {
    expect(MealInputSchema.safeParse({ meals: '3' }).data).toEqual({ meals: 3 });
    expect(MealInputSchema.safeParse({ meals: '3', description: '   ' }).data).toEqual({ meals: 3 });
    expect(MealInputSchema.safeParse({ meals: '3', description: '  Chicken, rice  ' }).data).toEqual({
      meals: 3,
      description: 'Chicken, rice',
    });
  });

  it('rejects 0, 11 and empty meals', () => {
    for (const meals of ['0', '11', '', '1.5']) {
      expect(MealInputSchema.safeParse({ meals }).success, meals).toBe(false);
    }
  });

  it('rejects a description over 200 characters', () => {
    expect(MealInputSchema.safeParse({ meals: '1', description: 'a'.repeat(200) }).success).toBe(true);
    const result = MealInputSchema.safeParse({ meals: '1', description: 'a'.repeat(201) });
    expect(result.error?.issues[0]?.message).toBe('Description must be 200 characters or fewer.');
  });
});
