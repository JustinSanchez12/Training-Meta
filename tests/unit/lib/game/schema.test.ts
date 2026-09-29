import { describe, expect, it } from 'vitest';
import { createPlayer, getDefaultStats } from '@/lib/game/player';
import { SaveDataSchema, StatProgressSchema } from '@/lib/game/schema';
import { STAT_ORDER } from '@/lib/game/stats';
import { legacyRawSave, legacySave } from '../../fixtures/saves';

describe('SaveDataSchema', () => {
  it('defaults a legacy save without weightGoal to lose, and rejects an unknown goal', () => {
    expect(SaveDataSchema.parse(legacyRawSave()).player.weightGoal).toBe('lose');
    const gain = legacySave();
    gain.player.weightGoal = 'gain';
    expect(SaveDataSchema.parse(gain).player.weightGoal).toBe('gain');
    const bad = { ...legacySave(), player: { ...legacySave().player, weightGoal: 'bulk' } };
    expect(SaveDataSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts a legacy save with float XP and a workout entry', () => {
    const result = SaveDataSchema.safeParse(legacySave());
    expect(result.success).toBe(true);
    expect(result.data?.stats.mileRun.xp).toBe(3.0000000000000004);
    expect(result.data?.workoutLog).toHaveLength(1);
  });

  it('accepts a freshly created player', () => {
    const save = createPlayer(
      { name: 'Link', gender: 'unspecified', age: 17, weight: 60, weightUnit: 'kg' },
      new Date('2026-01-01T00:00:00Z'),
    );
    expect(SaveDataSchema.safeParse(save).success).toBe(true);
    expect(save.player.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(save.player.startWeight).toBe(60);
    expect(save.player.currentWeight).toBe(60);
    expect(save.player.isNewPlayer).toBe(false);
    expect(Object.keys(save.stats)).toEqual([...STAT_ORDER]);
  });

  it('rejects an unknown stat key', () => {
    const save = { ...legacySave(), stats: { ...getDefaultStats(), telekinesis: { level: 1, xp: 0 } } };
    expect(SaveDataSchema.safeParse(save).success).toBe(false);
  });

  it('rejects a missing stat key', () => {
    const stats: Record<string, unknown> = { ...getDefaultStats() };
    delete stats.yoga;
    expect(SaveDataSchema.safeParse({ ...legacySave(), stats }).success).toBe(false);
  });

  it('rejects negative XP', () => {
    const save = legacySave();
    save.stats.squat = { level: 1, xp: -1 };
    expect(SaveDataSchema.safeParse(save).success).toBe(false);
  });

  it('rejects a missing player', () => {
    const save: Record<string, unknown> = { ...legacySave() };
    delete save.player;
    expect(SaveDataSchema.safeParse(save).success).toBe(false);
  });

  it('rejects a bad lastWorkoutDate but accepts an empty one', () => {
    expect(SaveDataSchema.safeParse({ ...legacySave(), lastWorkoutDate: 'yesterday' }).success).toBe(false);
    expect(SaveDataSchema.safeParse({ ...legacySave(), lastWorkoutDate: '' }).success).toBe(true);
  });
});

describe('StatProgressSchema', () => {
  it('bounds level to 1..99', () => {
    expect(StatProgressSchema.safeParse({ level: 0, xp: 0 }).success).toBe(false);
    expect(StatProgressSchema.safeParse({ level: 100, xp: 0 }).success).toBe(false);
    expect(StatProgressSchema.safeParse({ level: 99, xp: 11573 }).success).toBe(true);
  });
});
