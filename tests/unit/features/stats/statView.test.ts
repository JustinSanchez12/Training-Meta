import { describe, expect, it } from 'vitest';
import { getStatView } from '@/features/stats/statView';
import { STAT_DEFINITIONS, STAT_ORDER } from '@/lib/game/stats';

describe('getStatView', () => {
  it('shows level 1 with an empty bar at 0 XP', () => {
    const view = getStatView('squat', { level: 1, xp: 0 });
    expect(view).toMatchObject({
      key: 'squat',
      name: 'Squat',
      level: 1,
      isMax: false,
      fillPercent: 0,
      xpText: '0 / 20 XP',
      totalXp: 0,
    });
  });

  it('shows benchPress at 30 XP as level 2, 10 / 13 XP', () => {
    const view = getStatView('benchPress', { level: 2, xp: 30 });
    expect(view.level).toBe(2);
    expect(view.xpText).toBe('10 / 13 XP');
    expect(view.fillPercent).toBeCloseTo(76.923, 2);
    expect(view.totalXp).toBe(30);
    expect(view.isMax).toBe(false);
  });

  it('floors float XP from legacy saves for display', () => {
    const view = getStatView('mileRun', { level: 1, xp: 3.0000000000000004 });
    expect(view.xpText).toBe('3 / 20 XP');
    expect(view.totalXp).toBe(3);
    expect(view.level).toBe(1);
  });

  it('floors XP just below a level boundary without rounding up', () => {
    const view = getStatView('squat', { level: 1, xp: 19.9 });
    expect(view.level).toBe(1);
    expect(view.xpText).toBe('19 / 20 XP');
  });

  it('takes the level from raw XP, not the stored level field', () => {
    expect(getStatView('squat', { level: 1, xp: 20 }).level).toBe(2);
    expect(getStatView('squat', { level: 5, xp: 0 }).level).toBe(1);
  });

  it.each([11573, 11574, 1_000_000])('is MAX LEVEL at %d XP', (xp) => {
    const view = getStatView('deadlift', { level: 99, xp });
    expect(view.isMax).toBe(true);
    expect(view.level).toBe(99);
    expect(view.fillPercent).toBe(100);
    expect(view.xpText).toBe('MAX LEVEL');
    expect(view.totalXp).toBe(xp);
  });

  it('is not max one XP below the level 99 threshold', () => {
    const view = getStatView('deadlift', { level: 98, xp: 11572 });
    expect(view.isMax).toBe(false);
    expect(view.level).toBe(98);
    expect(view.fillPercent).toBeLessThan(100);
    expect(view.xpText).toMatch(/^\d+ \/ \d+ XP$/);
  });

  it('capitalises the category and uses the XP rule from STAT_DEFINITIONS', () => {
    const view = getStatView('mileRun', { level: 1, xp: 0 });
    expect(view.categoryLabel).toBe('Cardio');
    expect(view.xpRule).toBe(STAT_DEFINITIONS.mileRun.xpDescription);
    expect(view.xpRule).toBe('1 mile = 10 XP');
    expect(getStatView('benchPress', { level: 1, xp: 0 }).categoryLabel).toBe('Strength');
    expect(getStatView('yoga', { level: 1, xp: 0 }).categoryLabel).toBe('Flexibility');
    expect(getStatView('weight', { level: 1, xp: 0 }).categoryLabel).toBe('Body');
  });

  it.each(STAT_ORDER)('maps %s to its definition', (key) => {
    const view = getStatView(key, { level: 1, xp: 0 });
    const def = STAT_DEFINITIONS[key];
    expect(view).toMatchObject({ key, name: def.name, icon: def.icon, xpRule: def.xpDescription });
  });
});
