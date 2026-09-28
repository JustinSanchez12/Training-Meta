import { z } from 'zod';
import { MAX_LEVEL, STAT_ORDER } from './stats';

export const StatKeySchema = z.enum(STAT_ORDER);

export const StatProgressSchema = z.object({
  level: z.number().int().min(1).max(MAX_LEVEL),
  // Not .int(): legacy saves can hold float XP (e.g. 0.3 miles × 10 = 3.0000000000000004).
  xp: z.number().nonnegative(),
});

export const GenderSchema = z.enum(['male', 'female', 'unspecified']);
export const WeightUnitSchema = z.enum(['lbs', 'kg']);

export const PlayerSchema = z.object({
  name: z.string().min(1).max(20),
  gender: GenderSchema,
  age: z.number().int().min(1).max(120),
  startWeight: z.number().positive(),
  currentWeight: z.number().positive(),
  weightUnit: WeightUnitSchema,
  createdAt: z.iso.datetime(),
  isNewPlayer: z.boolean(),
});

// `data` stays loose until workout logging is ported (slice 3), which adds a schema per exercise type.
export const ExerciseEntrySchema = z.object({
  stat: StatKeySchema,
  name: z.string(),
  icon: z.string(),
  data: z.record(z.string(), z.union([z.number(), z.string(), z.null()])),
  xpGained: z.number(),
  timestamp: z.iso.datetime(),
});

export const WorkoutEntrySchema = z.object({
  id: z.string(),
  date: z.iso.date(),
  timestamp: z.iso.datetime(),
  exercises: z.array(ExerciseEntrySchema),
  totalXp: z.number(),
});

export const SaveDataSchema = z.object({
  player: PlayerSchema,
  // Enum-keyed record: all 12 stats required, unknown keys rejected.
  stats: z.record(StatKeySchema, StatProgressSchema),
  workoutLog: z.array(WorkoutEntrySchema),
  dailyStreak: z.number().int().nonnegative(),
  lastWorkoutDate: z.union([z.literal(''), z.iso.date()]),
});

export type StatProgress = z.infer<typeof StatProgressSchema>;
export type Gender = z.infer<typeof GenderSchema>;
export type WeightUnit = z.infer<typeof WeightUnitSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type SaveData = z.infer<typeof SaveDataSchema>;
