import type { StatProgress, WeightGoal } from '@/lib/game/schema';
import { MAX_LEVEL, STAT_DEFINITIONS, formatCategory, type StatKey } from '@/lib/game/stats';
import { getXpRule } from '@/lib/game/workout';
import { getXpProgress } from '@/lib/game/xp';

/** Everything the Stats grid and detail panel display for one stat. */
export interface StatView {
  key: StatKey;
  name: string;
  icon: string;
  level: number;
  isMax: boolean;
  /** 0–100, width of the XP bar. */
  fillPercent: number;
  /** "10 / 13 XP", or "MAX LEVEL". */
  xpText: string;
  totalXp: number;
  categoryLabel: string;
  xpRule: string;
}

export function getStatView(key: StatKey, stat: StatProgress, weightGoal: WeightGoal = 'lose'): StatView {
  const def = STAT_DEFINITIONS[key];
  // Level comes from raw XP (as in legacy); the stored `level` field is ignored.
  const progress = getXpProgress(stat.xp);
  const isMax = progress.level >= MAX_LEVEL;

  return {
    key,
    name: def.name,
    icon: def.icon,
    level: progress.level,
    isMax,
    fillPercent: isMax ? 100 : progress.progress * 100,
    // Floored: legacy saves can hold float XP like 3.0000000000000004.
    xpText: isMax ? 'MAX LEVEL' : `${Math.floor(progress.xpIntoLevel)} / ${progress.xpForNext} XP`,
    totalXp: Math.floor(stat.xp),
    categoryLabel: formatCategory(def.category),
    xpRule: getXpRule(key, weightGoal),
  };
}
