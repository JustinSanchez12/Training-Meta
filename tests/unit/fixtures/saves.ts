import type { SaveData } from '@/lib/game/schema';
import { getDefaultStats } from '@/lib/game/player';

/** A save shaped like one written by the legacy vanilla-JS app (plus the default weightGoal), including float XP and a workout entry. */
export function legacySave(): SaveData {
  const stats = getDefaultStats();
  stats.mileRun = { level: 1, xp: 3.0000000000000004 };
  stats.benchPress = { level: 2, xp: 30 };
  return {
    player: {
      name: 'Aragorn',
      gender: 'male',
      age: 30,
      startWeight: 180,
      currentWeight: 178.5,
      weightUnit: 'lbs',
      weightGoal: 'lose',
      createdAt: '2025-01-01T12:00:00.000Z',
      isNewPlayer: false,
    },
    stats,
    workoutLog: [
      {
        id: '1735732800000',
        date: '2025-01-01',
        timestamp: '2025-01-01T12:00:00.000Z',
        exercises: [
          {
            stat: 'mileRun',
            name: 'Mile Run',
            icon: '🏃',
            data: { distance: 0.3, time: null },
            xpGained: 3.0000000000000004,
            timestamp: '2025-01-01T12:00:00.000Z',
          },
          {
            stat: 'benchPress',
            name: 'Bench Press',
            icon: '🏋️',
            data: { sets: 3, reps: 10, weight: '135' },
            xpGained: 30,
            timestamp: '2025-01-01T12:00:00.000Z',
          },
        ],
        totalXp: 33.00000000000001,
      },
    ],
    dailyStreak: 1,
    lastWorkoutDate: '2025-01-01',
  };
}

/** The same save exactly as the legacy app stored it: no `weightGoal` (added in slice 4). */
export function legacyRawSave(): unknown {
  const save = legacySave();
  const player: Record<string, unknown> = { ...save.player };
  delete player.weightGoal;
  return { ...save, player };
}
