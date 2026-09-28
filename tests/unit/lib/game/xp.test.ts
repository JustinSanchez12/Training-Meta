import { describe, expect, it } from 'vitest';
import { getDefaultStats } from '@/lib/game/player';
import { MAX_LEVEL } from '@/lib/game/stats';
import { getLevelFromXp, getOverallLevel, getTotalLevel, getXpForLevel, getXpProgress } from '@/lib/game/xp';

describe('getXpForLevel', () => {
  it('matches the legacy curve floor(L² × 1.1 + 8L)', () => {
    expect(getXpForLevel(1)).toBe(0);
    expect(getXpForLevel(2)).toBe(20);
    expect(getXpForLevel(10)).toBe(190);
    expect(getXpForLevel(99)).toBe(11573);
  });

  it('returns 0 for levels at or below 1', () => {
    expect(getXpForLevel(0)).toBe(0);
    expect(getXpForLevel(-5)).toBe(0);
  });

  it('is strictly increasing', () => {
    for (let level = 1; level < MAX_LEVEL; level++) {
      expect(getXpForLevel(level + 1)).toBeGreaterThan(getXpForLevel(level));
    }
  });
});

describe('getLevelFromXp', () => {
  it('maps XP boundaries to levels', () => {
    expect(getLevelFromXp(0)).toBe(1);
    expect(getLevelFromXp(19)).toBe(1);
    expect(getLevelFromXp(19.999)).toBe(1);
    expect(getLevelFromXp(20)).toBe(2);
    expect(getLevelFromXp(11572)).toBe(98);
    expect(getLevelFromXp(11573)).toBe(99);
  });

  it('caps at level 99', () => {
    expect(getLevelFromXp(1_000_000_000)).toBe(99);
  });

  it('round-trips with getXpForLevel', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      expect(getLevelFromXp(getXpForLevel(level))).toBe(level);
    }
  });
});

describe('getXpProgress', () => {
  it('reports progress within a level', () => {
    // Level 2 starts at 20 XP, level 3 at floor(9.9 + 24) = 33.
    expect(getXpProgress(26)).toEqual({ level: 2, currentXp: 26, xpForNext: 13, xpIntoLevel: 6, progress: 6 / 13 });
  });

  it('is 0 at the start of level 1', () => {
    const progress = getXpProgress(0);
    expect(progress.level).toBe(1);
    expect(progress.progress).toBe(0);
    expect(progress.xpForNext).toBe(20);
  });

  it('returns progress 1 and xpForNext 0 at max level', () => {
    const progress = getXpProgress(getXpForLevel(99));
    expect(progress.level).toBe(99);
    expect(progress.progress).toBe(1);
    expect(progress.xpForNext).toBe(0);
    expect(getXpProgress(999_999).progress).toBe(1);
  });
});

describe('getTotalLevel / getOverallLevel', () => {
  it('default stats give overall level 1 and total level 12', () => {
    const stats = getDefaultStats();
    expect(getTotalLevel(stats)).toBe(12);
    expect(getOverallLevel(stats)).toBe(1);
  });

  it('derives levels from XP and rounds the average down', () => {
    const stats = getDefaultStats();
    stats.squat = { level: 1, xp: getXpForLevel(13) }; // 11 × 1 + 13 = 24 → overall 2
    expect(getTotalLevel(stats)).toBe(24);
    expect(getOverallLevel(stats)).toBe(2);
    stats.deadlift = { level: 1, xp: getXpForLevel(2) }; // 25 / 12 → 2
    expect(getOverallLevel(stats)).toBe(2);
  });
});
