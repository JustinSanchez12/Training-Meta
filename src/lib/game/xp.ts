import type { StatProgress } from './schema';
import { MAX_LEVEL, STAT_ORDER, type StatKey } from './stats';

export interface XpProgress {
  level: number;
  currentXp: number;
  /** XP span of the current level; 0 at max level. */
  xpForNext: number;
  xpIntoLevel: number;
  /** 0..1 through the current level. */
  progress: number;
}

/** Total XP needed to reach `level`. Same curve as the legacy app: floor(L² × 1.1 + 8L). */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(level ** 2 * 1.1 + level * 8);
}

export function getLevelFromXp(totalXp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && totalXp >= getXpForLevel(level + 1)) {
    level++;
  }
  return level;
}

export function getXpProgress(totalXp: number): XpProgress {
  const level = getLevelFromXp(totalXp);
  if (level >= MAX_LEVEL) {
    return { level: MAX_LEVEL, currentXp: totalXp, xpForNext: 0, xpIntoLevel: 0, progress: 1 };
  }

  const xpForCurrent = getXpForLevel(level);
  const xpNeeded = getXpForLevel(level + 1) - xpForCurrent;
  const xpIntoLevel = totalXp - xpForCurrent;

  return { level, currentXp: totalXp, xpForNext: xpNeeded, xpIntoLevel, progress: xpIntoLevel / xpNeeded };
}

/** Sum of every stat's level (the "Total Level" shown in the Hub). */
export function getTotalLevel(stats: Record<StatKey, StatProgress>): number {
  return STAT_ORDER.reduce((sum, key) => sum + getLevelFromXp(stats[key].xp), 0);
}

/** Average stat level, rounded down (the character's "Level"). */
export function getOverallLevel(stats: Record<StatKey, StatProgress>): number {
  return Math.floor(getTotalLevel(stats) / STAT_ORDER.length);
}
