import { describe, expect, it } from 'vitest';
import { getDefaultStats } from '@/lib/game/player';
import { SaveDataSchema, type ExerciseEntry, type SaveData } from '@/lib/game/schema';
import {
  addToSession,
  applyWorkout,
  buildExerciseEntry,
  calculateXpGain,
  formatExerciseData,
  getXpRule,
  roundXp,
  toLocalIsoDate,
  updateStreak,
} from '@/lib/game/workout';
import { STAT_DEFINITIONS } from '@/lib/game/stats';
import { legacySave } from '../../fixtures/saves';

// Local-time constructor so these pass in any timezone.
const NOW = new Date(2026, 8, 28, 23, 30);
type BuildContext = Parameters<typeof buildExerciseEntry>[2];
const lbs: BuildContext = { previousWeight: 180, weightUnit: 'lbs', now: NOW };

function entry(stat: Parameters<typeof buildExerciseEntry>[0], input: Parameters<typeof buildExerciseEntry>[1], context: BuildContext = lbs) {
  return buildExerciseEntry(stat, input, context);
}

describe('roundXp', () => {
  it('rounds to 1 decimal place', () => {
    expect(roundXp(0.3 * 10)).toBe(3);
    expect(roundXp(3.0000000000000004)).toBe(3);
    expect(roundXp(1.5)).toBe(1.5);
    expect(roundXp(1.44)).toBe(1.4);
    expect(roundXp(0)).toBe(0);
  });
});

describe('calculateXpGain', () => {
  it.each([
    ['benchPress', { sets: 3, reps: 10 }, 30],
    ['mileRun', { distance: 0.3 }, 3],
    ['cycling', { distance: 0.3 }, 1.5],
    ['swimming', { laps: 4 }, 20],
    ['yoga', { sessions: 2 }, 20],
    ['nutrition', { meals: 3 }, 15],
  ] as const)('%s %j = %d XP', (stat, data, xp) => {
    expect(calculateXpGain(stat, data)).toBe(xp);
  });

  it('gives exactly 3 (no float noise) for 0.3 miles of running', () => {
    expect(Object.is(calculateXpGain('mileRun', { distance: 0.3 }), 3)).toBe(true);
  });

  it('treats missing or non-numeric legacy values as 0, and a missing session/meal count as 1', () => {
    expect(calculateXpGain('squat', { sets: 3, reps: null })).toBe(0);
    expect(calculateXpGain('squat', { sets: '3', reps: 10 })).toBe(0);
    expect(calculateXpGain('mileRun', {})).toBe(0);
    expect(calculateXpGain('yoga', {})).toBe(10);
    expect(calculateXpGain('nutrition', { meals: null })).toBe(5);
  });

  describe('weight (loss only, threshold 0.5 lb)', () => {
    it.each([
      [179.5, 10],
      [179.8, 0],
      [180, 0],
      [181, 0],
      [170, 10],
    ])('180 lb → %d lb = %d XP', (logged, xp) => {
      const built = entry('weight', { currentWeight: logged });
      expect(built.xpGained).toBe(xp);
      expect(built.data).toEqual({ currentWeight: logged, change: Math.round((180 - logged) * 100) / 100 });
    });

    it('converts kg to lb: 80 kg → 79.7 kg (0.66 lb) = 10 XP', () => {
      const built = entry('weight', { currentWeight: 79.7 }, { previousWeight: 80, weightUnit: 'kg', now: NOW });
      expect(built.data.change).toBe(0.3);
      expect(built.xpGained).toBe(10);
    });

    it('80 kg → 79.8 kg (0.44 lb) = 0 XP', () => {
      const built = entry('weight', { currentWeight: 79.8 }, { previousWeight: 80, weightUnit: 'kg', now: NOW });
      expect(built.xpGained).toBe(0);
    });

    it('a legacy {currentWeight}-only entry (no change) earns 0', () => {
      expect(calculateXpGain('weight', { currentWeight: 175 })).toBe(0);
    });
  });

  describe('weight goals (change = previous − current)', () => {
    it.each([
      // [goal, change in lb, xp]
      ['lose', 0.5, 10],
      ['lose', 0.49, 0],
      ['lose', -0.5, 0],
      ['gain', -0.5, 10],
      ['gain', -0.49, 0],
      ['gain', 0.5, 0],
      ['maintain', 0.5, 10],
      ['maintain', -0.5, 10],
      ['maintain', 0, 10],
      ['maintain', 0.51, 0],
      ['maintain', -0.51, 0],
    ] as const)('%s with change %d lb = %d XP', (goal, change, xp) => {
      expect(calculateXpGain('weight', { change }, 'lbs', goal)).toBe(xp);
    });

    it.each([
      // 0.23 kg = 0.507 lb, 0.22 kg = 0.485 lb
      ['lose', 0.23, 10],
      ['lose', 0.22, 0],
      ['gain', -0.23, 10],
      ['gain', -0.22, 0],
      ['maintain', 0.22, 10],
      ['maintain', -0.23, 0],
    ] as const)('kg: %s with change %d kg = %d XP', (goal, change, xp) => {
      expect(calculateXpGain('weight', { change }, 'kg', goal)).toBe(xp);
    });

    it('defaults to lose, and buildExerciseEntry passes the goal through', () => {
      expect(calculateXpGain('weight', { change: -1 })).toBe(0);
      expect(entry('weight', { currentWeight: 181 }, { ...lbs, weightGoal: 'gain' }).xpGained).toBe(10);
      expect(entry('weight', { currentWeight: 180.2 }, { ...lbs, weightGoal: 'maintain' }).xpGained).toBe(10);
    });
  });
});

describe('getXpRule', () => {
  it('gives Weight a goal-specific rule, defaulting to lose', () => {
    expect(getXpRule('weight')).toBe('Lose 0.5+ lb (0.23 kg) since last weigh-in = 10 XP');
    expect(getXpRule('weight', 'gain')).toBe('Gain 0.5+ lb (0.23 kg) since last weigh-in = 10 XP');
    expect(getXpRule('weight', 'maintain')).toBe('Stay within 0.5 lb (0.22 kg) of last weigh-in = 10 XP');
  });

  it('uses the stat definition for every other stat, whatever the goal', () => {
    expect(getXpRule('benchPress', 'gain')).toBe(STAT_DEFINITIONS.benchPress.xpDescription);
  });
});

describe('buildExerciseEntry', () => {
  it('builds a reps entry, dropping undefined optional fields', () => {
    const built = entry('benchPress', { sets: 3, reps: 10, weight: undefined });
    expect(built).toEqual({
      stat: 'benchPress',
      name: 'Bench Press',
      icon: '🏋️',
      data: { sets: 3, reps: 10 },
      xpGained: 30,
      timestamp: NOW.toISOString(),
    });
    expect('weight' in built.data).toBe(false);
  });

  it('keeps an optional value that was given', () => {
    expect(entry('nutrition', { meals: 2, description: 'Salad' }).data).toEqual({ meals: 2, description: 'Salad' });
  });
});

describe('addToSession', () => {
  it('appends without mutating the session', () => {
    const session: ExerciseEntry[] = [entry('benchPress', { sets: 3, reps: 10 })];
    const next = addToSession(session, entry('mileRun', { distance: 1 }));
    expect(next.map((e) => e.stat)).toEqual(['benchPress', 'mileRun']);
    expect(session).toHaveLength(1);
  });

  it('allows several entries of the same non-weight stat', () => {
    let session: ExerciseEntry[] = [];
    session = addToSession(session, entry('squat', { sets: 1, reps: 5 }));
    session = addToSession(session, entry('squat', { sets: 2, reps: 5 }));
    expect(session).toHaveLength(2);
  });

  it('replaces an earlier weigh-in with the new one (one Weight entry per session)', () => {
    let session: ExerciseEntry[] = [];
    session = addToSession(session, entry('weight', { currentWeight: 170 }));
    session = addToSession(session, entry('benchPress', { sets: 3, reps: 10 }));
    session = addToSession(session, entry('weight', { currentWeight: 179.5 }));
    expect(session.map((e) => e.stat)).toEqual(['benchPress', 'weight']);
    expect(session.filter((e) => e.stat === 'weight')).toHaveLength(1);
    expect(session[1]?.data.currentWeight).toBe(179.5);
    expect(session[1]?.xpGained).toBe(10);
  });
});

describe('addToSession with wrapped items', () => {
  interface Wrapped {
    id: string;
    entry: ExerciseEntry;
  }
  const wrap = (id: string, e: ExerciseEntry): Wrapped => ({ id, entry: e });
  const entryOf = (item: Wrapped) => item.entry;

  it('appends without mutating, keeping the wrapper objects', () => {
    const first = wrap('a', entry('benchPress', { sets: 3, reps: 10 }));
    const session: Wrapped[] = [first];
    const second = wrap('b', entry('benchPress', { sets: 3, reps: 10 }));
    const next = addToSession(session, second, entryOf);
    expect(next).toEqual([first, second]);
    expect(next[0]).toBe(first);
    expect(next[1]).toBe(second);
    expect(session).toHaveLength(1);
  });

  it('replaces an earlier weigh-in, judged by the wrapped entry', () => {
    let session: Wrapped[] = [];
    session = addToSession(session, wrap('w1', entry('weight', { currentWeight: 170 })), entryOf);
    session = addToSession(session, wrap('b', entry('benchPress', { sets: 3, reps: 10 })), entryOf);
    session = addToSession(session, wrap('w2', entry('weight', { currentWeight: 179.5 })), entryOf);
    expect(session.map((i) => i.id)).toEqual(['b', 'w2']);
  });
});

describe('formatExerciseData', () => {
  it('formats each XP type', () => {
    expect(formatExerciseData('benchPress', { sets: 3, reps: 10, weight: 135 })).toBe('3×10 @ 135 lbs');
    expect(formatExerciseData('mileRun', { distance: 0.3 })).toBe('0.3 miles');
    expect(formatExerciseData('swimming', { laps: 4 })).toBe('4 laps');
    expect(formatExerciseData('yoga', { sessions: 2, duration: 45 })).toBe('2 session(s), 45 min');
    expect(formatExerciseData('weight', { currentWeight: 80, change: 0.3 }, 'kg')).toBe('80 kg');
    expect(formatExerciseData('nutrition', { meals: 3 })).toBe('3 meal(s)');
  });

  it('shows "—" for missing, null or empty legacy values', () => {
    expect(formatExerciseData('benchPress', { sets: 3, reps: 10 })).toBe('3×10 @ — lbs');
    expect(formatExerciseData('benchPress', { sets: null, reps: '', weight: null })).toBe('—×— @ — lbs');
    expect(formatExerciseData('mileRun', { distance: null, time: null })).toBe('— miles');
    expect(formatExerciseData('swimming', {})).toBe('— laps');
    expect(formatExerciseData('yoga', {})).toBe('1 session(s), — min');
    expect(formatExerciseData('weight', { currentWeight: null })).toBe('— lbs');
    expect(formatExerciseData('weight', {})).toBe('— lbs');
    expect(formatExerciseData('nutrition', {})).toBe('1 meal(s)');
  });

  it('formats a legacy {currentWeight}-only Weight entry', () => {
    expect(formatExerciseData('weight', { currentWeight: 175 })).toBe('175 lbs');
  });
});

describe('toLocalIsoDate', () => {
  it('uses the local date, so 23:30 local stays on the same day', () => {
    expect(toLocalIsoDate(new Date(2026, 8, 28, 23, 30))).toBe('2026-09-28');
    expect(toLocalIsoDate(new Date(2026, 8, 28, 0, 5))).toBe('2026-09-28');
  });

  it('zero-pads month and day', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('updateStreak', () => {
  it('leaves the streak unchanged on the same local day', () => {
    expect(updateStreak(4, '2026-09-28', NOW)).toEqual({ dailyStreak: 4, lastWorkoutDate: '2026-09-28' });
  });

  it('adds 1 when the last workout was local yesterday (23:30 counts as today)', () => {
    expect(updateStreak(4, '2026-09-27', NOW)).toEqual({ dailyStreak: 5, lastWorkoutDate: '2026-09-28' });
  });

  it('resets to 1 after a gap', () => {
    expect(updateStreak(4, '2026-09-26', NOW)).toEqual({ dailyStreak: 1, lastWorkoutDate: '2026-09-28' });
  });

  it("starts at 1 when there's no previous workout ('')", () => {
    expect(updateStreak(0, '', NOW)).toEqual({ dailyStreak: 1, lastWorkoutDate: '2026-09-28' });
  });

  it('leaves a future lastWorkoutDate (old UTC save) unchanged', () => {
    expect(updateStreak(3, '2026-09-29', NOW)).toEqual({ dailyStreak: 3, lastWorkoutDate: '2026-09-29' });
  });

  it('handles month and year boundaries', () => {
    expect(updateStreak(2, '2026-02-28', new Date(2026, 2, 1, 0, 30)).dailyStreak).toBe(3);
    expect(updateStreak(2, '2025-12-31', new Date(2026, 0, 1, 9, 0)).dailyStreak).toBe(3);
  });

  it('handles a DST change day (yesterday via the date constructor)', () => {
    // US DST 2026 starts Mar 8 and ends Nov 1; EU on Mar 29 and Oct 25. Harmless in zones without DST.
    for (const [y, m, d] of [
      [2026, 2, 9],
      [2026, 10, 2],
      [2026, 2, 30],
      [2026, 9, 26],
    ] as const) {
      const yesterday = toLocalIsoDate(new Date(y, m, d - 1, 12));
      expect(updateStreak(1, yesterday, new Date(y, m, d, 0, 30)).dailyStreak).toBe(2);
    }
  });
});

describe('applyWorkout', () => {
  function session(): ExerciseEntry[] {
    return [entry('benchPress', { sets: 3, reps: 10 }), entry('mileRun', { distance: 0.3 })];
  }

  it('throws on an empty session', () => {
    expect(() => applyWorkout(legacySave(), [], NOW)).toThrow();
  });

  it('does not mutate the input save or exercises', () => {
    const save = legacySave();
    const exercises = [...session(), entry('weight', { currentWeight: 170 })];
    const saveBefore = structuredClone(save);
    const exercisesBefore = structuredClone(exercises);

    const result = applyWorkout(save, exercises, NOW);

    expect(save).toEqual(saveBefore);
    expect(exercises).toEqual(exercisesBefore);
    expect(result.save).not.toBe(save);
    expect(result.save.stats).not.toBe(save.stats);
    expect(result.save.player).not.toBe(save.player);
    expect(result.save.workoutLog).not.toBe(save.workoutLog);
  });

  it('adds XP, updates levels and reports level-ups', () => {
    const result = applyWorkout(legacySave(), session(), NOW);
    // Bench: 30 + 30 = 60 → level 4 (L4 = 49, L5 = 67). Mile run: 3.0000000000000004 + 3 → 6, still level 1.
    expect(result.save.stats.benchPress).toEqual({ level: 4, xp: 60 });
    expect(result.save.stats.mileRun).toEqual({ level: 1, xp: 6 });
    expect(result.save.stats.squat).toEqual({ level: 1, xp: 0 });
    expect(result.levelUps).toEqual([
      { stat: 'benchPress', name: 'Bench Press', icon: '🏋️', previousLevel: 2, newLevel: 4 },
    ]);
  });

  it('reports one level-up per stat, from the level before the session', () => {
    const exercises = [entry('squat', { sets: 2, reps: 10 }), entry('squat', { sets: 2, reps: 10 })];
    const result = applyWorkout(legacySave(), exercises, NOW);
    expect(result.save.stats.squat).toEqual({ level: 3, xp: 40 });
    expect(result.levelUps).toEqual([{ stat: 'squat', name: 'Squat', icon: '🦵', previousLevel: 1, newLevel: 3 }]);
  });

  it('returns no level-ups when no level changes', () => {
    expect(applyWorkout(legacySave(), [entry('mileRun', { distance: 0.3 })], NOW).levelUps).toEqual([]);
  });

  it('prepends a workout entry with a local date and rounded total', () => {
    const exercises = [...session(), entry('cycling', { distance: 0.3 })];
    const { save, entry: logged } = applyWorkout(legacySave(), exercises, NOW);
    expect(logged).toEqual({
      id: String(NOW.getTime()),
      date: '2026-09-28',
      timestamp: NOW.toISOString(),
      exercises,
      totalXp: 34.5,
    });
    expect(save.workoutLog).toHaveLength(2);
    expect(save.workoutLog[0]).toBe(logged);
    expect(save.workoutLog[1]?.id).toBe('1735732800000');
  });

  it('updates the streak with local dates', () => {
    const base: SaveData = { ...legacySave(), dailyStreak: 6, lastWorkoutDate: '2026-09-27' };
    expect(applyWorkout(base, session(), NOW).save).toMatchObject({ dailyStreak: 7, lastWorkoutDate: '2026-09-28' });

    const gap = legacySave(); // last workout 2025-01-01
    expect(applyWorkout(gap, session(), NOW).save).toMatchObject({ dailyStreak: 1, lastWorkoutDate: '2026-09-28' });

    const future: SaveData = { ...legacySave(), dailyStreak: 2, lastWorkoutDate: '2026-09-29' };
    expect(applyWorkout(future, session(), NOW).save).toMatchObject({ dailyStreak: 2, lastWorkoutDate: '2026-09-29' });
  });

  it('sets player.currentWeight to the logged weight and adds Weight XP', () => {
    const result = applyWorkout(legacySave(), [entry('weight', { currentWeight: 177 }, { ...lbs, previousWeight: 178.5 })], NOW);
    expect(result.save.player.currentWeight).toBe(177);
    expect(result.save.player.startWeight).toBe(180);
    expect(result.save.stats.weight.xp).toBe(10);
  });

  it('updates currentWeight even for a gain (0 XP)', () => {
    const result = applyWorkout(legacySave(), [entry('weight', { currentWeight: 185 }, { ...lbs, previousWeight: 178.5 })], NOW);
    expect(result.save.player.currentWeight).toBe(185);
    expect(result.save.stats.weight.xp).toBe(0);
  });

  it('leaves currentWeight alone without a weigh-in', () => {
    expect(applyWorkout(legacySave(), session(), NOW).save.player.currentWeight).toBe(178.5);
  });

  it('produces a save that still passes SaveDataSchema', () => {
    const exercises = [...session(), entry('weight', { currentWeight: 170 }), entry('nutrition', { meals: 2, description: 'Oats' })];
    expect(SaveDataSchema.safeParse(applyWorkout(legacySave(), exercises, NOW).save).success).toBe(true);
  });

  it('keeps XP rounded to 1 decimal when accumulating', () => {
    const save: SaveData = { ...legacySave(), stats: { ...getDefaultStats(), cycling: { level: 1, xp: 0.1 } } };
    const exercises = [entry('cycling', { distance: 0.3 }), entry('cycling', { distance: 0.3 })];
    expect(applyWorkout(save, exercises, NOW).save.stats.cycling.xp).toBe(3.1);
  });
});

describe('legacy saves with loose Weight data', () => {
  function withLegacyWeightEntry(data: Record<string, number | string | null>): unknown {
    const save = legacySave();
    save.workoutLog[0]?.exercises.push({
      stat: 'weight',
      name: 'Weight',
      icon: '⚖️',
      data,
      xpGained: 0,
      timestamp: '2025-01-01T12:00:00.000Z',
    });
    return JSON.parse(JSON.stringify(save));
  }

  it('loads a Weight entry with only {currentWeight} (no change)', () => {
    const result = SaveDataSchema.safeParse(withLegacyWeightEntry({ currentWeight: 175 }));
    expect(result.success).toBe(true);
    const weight = result.data?.workoutLog[0]?.exercises.find((e) => e.stat === 'weight');
    expect(weight?.data).toEqual({ currentWeight: 175 });
    expect(formatExerciseData('weight', weight?.data ?? {})).toBe('175 lbs');
  });

  it('loads a Weight entry with null values (NaN serialised by JSON) and shows "—"', () => {
    const result = SaveDataSchema.safeParse(withLegacyWeightEntry({ currentWeight: Number.NaN, change: null }));
    expect(result.success).toBe(true);
    const weight = result.data?.workoutLog[0]?.exercises.find((e) => e.stat === 'weight');
    expect(weight?.data).toEqual({ currentWeight: null, change: null });
    expect(formatExerciseData('weight', weight?.data ?? {})).toBe('— lbs');
    expect(calculateXpGain('weight', weight?.data ?? {})).toBe(0);
  });

  it('still applies a new workout on top of such a save', () => {
    const parsed = SaveDataSchema.parse(withLegacyWeightEntry({ currentWeight: null }));
    const result = applyWorkout(parsed, [entry('weight', { currentWeight: 178 }, { ...lbs, previousWeight: 178.5 })], NOW);
    expect(result.save.player.currentWeight).toBe(178);
    expect(result.save.stats.weight.xp).toBe(10);
  });
});
