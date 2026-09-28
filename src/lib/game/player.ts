import type { Gender, SaveData, StatProgress, WeightUnit } from './schema';
import { STAT_ORDER, type StatKey } from './stats';

export interface NewPlayerInput {
  name: string;
  gender: Gender;
  age: number;
  weight: number;
  weightUnit: WeightUnit;
}

export function getDefaultStats(): Record<StatKey, StatProgress> {
  return Object.fromEntries(STAT_ORDER.map((key) => [key, { level: 1, xp: 0 }])) as Record<StatKey, StatProgress>;
}

export function createPlayer(input: NewPlayerInput, now: Date = new Date()): SaveData {
  return {
    player: {
      name: input.name,
      gender: input.gender,
      age: input.age,
      startWeight: input.weight,
      currentWeight: input.weight,
      weightUnit: input.weightUnit,
      createdAt: now.toISOString(),
      isNewPlayer: false,
    },
    stats: getDefaultStats(),
    workoutLog: [],
    dailyStreak: 0,
    lastWorkoutDate: '',
  };
}
