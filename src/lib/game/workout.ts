import type { ExerciseInput } from './exercise';
import type { ExerciseEntry, SaveData, StatProgress, WeightGoal, WeightUnit, WorkoutEntry } from './schema';
import { STAT_DEFINITIONS, type StatKey } from './stats';
import { getLevelFromXp } from './xp';

export const LB_PER_KG = 2.20462;
/** Weight XP threshold (lb) vs. the last saved weight: lose/gain at least this much, or stay within it to maintain. */
export const WEIGHT_THRESHOLD_LB = 0.5;

const DISTANCE_XP_PER_MILE: Partial<Record<StatKey, number>> = { mileRun: 10, cycling: 5 };

/** Saved exercise data. Loose on purpose: legacy saves contain nulls and partial shapes. */
export type ExerciseData = ExerciseEntry['data'];

export interface LevelUp {
  stat: StatKey;
  name: string;
  icon: string;
  previousLevel: number;
  newLevel: number;
}

export interface WorkoutResult {
  save: SaveData;
  entry: WorkoutEntry;
  levelUps: LevelUp[];
}

/** 1 decimal place: avoids float noise (0.3 × 10 = 3.0000000000000004) but keeps half-XP gains like 0.3 mi × 5 = 1.5. */
export function roundXp(xp: number): number {
  return Math.round(xp * 10) / 10;
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function calculateXpGain(
  stat: StatKey,
  data: ExerciseData,
  weightUnit: WeightUnit = 'lbs',
  weightGoal: WeightGoal = 'lose',
): number {
  let xp: number;
  switch (STAT_DEFINITIONS[stat].xpType) {
    case 'reps':
      xp = num(data.sets) * num(data.reps);
      break;
    case 'distance':
      xp = num(data.distance) * (DISTANCE_XP_PER_MILE[stat] ?? 5);
      break;
    case 'laps':
      xp = num(data.laps) * 5;
      break;
    case 'session':
      xp = (num(data.sessions) || 1) * 10;
      break;
    case 'weight': {
      // `change` is previous − current in the player's unit (positive = lost weight).
      const lostLb = num(data.change) * (weightUnit === 'kg' ? LB_PER_KG : 1);
      // Round away float noise from the kg conversion before comparing with the threshold.
      const lost = Math.round(lostLb * 1000) / 1000;
      const onTarget =
        weightGoal === 'lose'
          ? lost >= WEIGHT_THRESHOLD_LB
          : weightGoal === 'gain'
            ? -lost >= WEIGHT_THRESHOLD_LB
            : Math.abs(lost) <= WEIGHT_THRESHOLD_LB;
      xp = onTarget ? 10 : 0;
      break;
    }
    case 'meal':
      xp = (num(data.meals) || 1) * 5;
      break;
  }
  return roundXp(xp);
}

interface BuildContext {
  /** The player's last saved weight, which a Weight entry is compared against. */
  previousWeight: number;
  weightUnit: WeightUnit;
  weightGoal?: WeightGoal;
  now?: Date;
}

/** Turns validated form input into a session entry with its XP computed. */
export function buildExerciseEntry(stat: StatKey, input: ExerciseInput, context: BuildContext): ExerciseEntry {
  const def = STAT_DEFINITIONS[stat];
  const data: ExerciseData = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) data[key] = value;
  }
  if (def.xpType === 'weight') {
    data.change = Math.round((context.previousWeight - num(data.currentWeight)) * 100) / 100;
  }

  return {
    stat,
    name: def.name,
    icon: def.icon,
    data,
    xpGained: calculateXpGain(stat, data, context.weightUnit, context.weightGoal),
    timestamp: (context.now ?? new Date()).toISOString(),
  };
}

const WEIGHT_RULES: Record<WeightGoal, string> = {
  lose: 'Lose 0.5+ lb (0.23 kg) since last weigh-in = 10 XP',
  gain: 'Gain 0.5+ lb (0.23 kg) since last weigh-in = 10 XP',
  maintain: 'Stay within 0.5 lb (0.23 kg) of last weigh-in = 10 XP',
};

/** The XP rule shown to the player; Weight's depends on their goal. */
export function getXpRule(stat: StatKey, weightGoal: WeightGoal = 'lose'): string {
  const def = STAT_DEFINITIONS[stat];
  return def.xpType === 'weight' ? WEIGHT_RULES[weightGoal] : def.xpDescription;
}

/** Adds an entry to the in-progress session. A new weigh-in replaces any earlier one: one Weight entry per session. */
export function addToSession(session: readonly ExerciseEntry[], entry: ExerciseEntry): ExerciseEntry[];
/** Same rule for session items that wrap an entry (e.g. with an id). */
export function addToSession<T>(session: readonly T[], item: T, entryOf: (item: T) => ExerciseEntry): T[];
export function addToSession<T>(
  session: readonly T[],
  item: T,
  entryOf: (item: T) => ExerciseEntry = (value) => value as unknown as ExerciseEntry,
): T[] {
  const isWeight = (value: T) => STAT_DEFINITIONS[entryOf(value).stat].xpType === 'weight';
  const kept = isWeight(item) ? session.filter((value) => !isWeight(value)) : session;
  return [...kept, item];
}

/** One-line summary, e.g. "3×10 @ 135 lbs". Tolerates legacy data with missing or null fields. */
export function formatExerciseData(stat: StatKey, data: ExerciseData, weightUnit: WeightUnit = 'lbs'): string {
  const show = (value: unknown) => (value === undefined || value === null || value === '' ? '—' : String(value));
  switch (STAT_DEFINITIONS[stat].xpType) {
    case 'reps':
      return `${show(data.sets)}×${show(data.reps)} @ ${show(data.weight)} ${weightUnit}`;
    case 'distance':
      return `${show(data.distance)} miles`;
    case 'laps':
      return `${show(data.laps)} laps`;
    case 'session':
      return `${show(data.sessions ?? 1)} session(s), ${show(data.duration)} min`;
    case 'weight':
      return `${show(data.currentWeight)} ${weightUnit}`;
    case 'meal':
      return `${show(data.meals ?? 1)} meal(s)`;
  }
}

/** YYYY-MM-DD in the player's local time zone (legacy used UTC, so late-evening workouts counted as tomorrow). */
export function toLocalIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function updateStreak(
  dailyStreak: number,
  lastWorkoutDate: string,
  now: Date,
): { dailyStreak: number; lastWorkoutDate: string } {
  const today = toLocalIsoDate(now);
  // Same day, or a "future" date written by the old UTC logic: leave the streak alone.
  if (lastWorkoutDate >= today) return { dailyStreak, lastWorkoutDate };

  const yesterday = toLocalIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  return { dailyStreak: lastWorkoutDate === yesterday ? dailyStreak + 1 : 1, lastWorkoutDate: today };
}

/** Applies a finished session to a save. Pure: returns a new save and never mutates the input. */
export function applyWorkout(save: SaveData, exercises: readonly ExerciseEntry[], now: Date = new Date()): WorkoutResult {
  if (exercises.length === 0) throw new Error('Cannot apply an empty workout');

  const stats: Record<StatKey, StatProgress> = { ...save.stats };
  const levelUps: LevelUp[] = [];
  const touched = new Map<StatKey, number>();

  for (const exercise of exercises) {
    const before = stats[exercise.stat];
    if (!touched.has(exercise.stat)) touched.set(exercise.stat, getLevelFromXp(before.xp));
    const xp = roundXp(before.xp + exercise.xpGained);
    stats[exercise.stat] = { level: getLevelFromXp(xp), xp };
  }

  for (const [stat, previousLevel] of touched) {
    const newLevel = stats[stat].level;
    if (newLevel > previousLevel) {
      const def = STAT_DEFINITIONS[stat];
      levelUps.push({ stat, name: def.name, icon: def.icon, previousLevel, newLevel });
    }
  }

  const entry: WorkoutEntry = {
    id: String(now.getTime()),
    date: toLocalIsoDate(now),
    timestamp: now.toISOString(),
    exercises: [...exercises],
    totalXp: roundXp(exercises.reduce((sum, e) => sum + e.xpGained, 0)),
  };

  const lastWeighIn = [...exercises].reverse().find((e) => STAT_DEFINITIONS[e.stat].xpType === 'weight');
  const loggedWeight = lastWeighIn?.data.currentWeight;
  const player =
    typeof loggedWeight === 'number' ? { ...save.player, currentWeight: loggedWeight } : save.player;

  return {
    save: {
      ...save,
      player,
      stats,
      workoutLog: [entry, ...save.workoutLog],
      ...updateStreak(save.dailyStreak, save.lastWorkoutDate, now),
    },
    entry,
    levelUps,
  };
}
