import { z } from 'zod';
import type { XpType } from './stats';

/** Form inputs arrive as strings: blank → undefined, anything else → Number (NaN is rejected by z.number). */
function toNumber(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim() === '' ? undefined : Number(value);
}

interface NumberRule {
  label: string;
  min: number;
  max: number;
  int?: boolean;
}

function numberSchema({ label, min, max, int }: NumberRule) {
  const range = `${label} must be between ${min} and ${max}.`;
  let schema = z.number({ error: `Please enter ${label.toLowerCase()}.` }).min(min, range).max(max, range);
  if (int) schema = schema.int(`${label} must be a whole number.`);
  return schema;
}

const required = (rule: NumberRule) => z.preprocess(toNumber, numberSchema(rule));
const optional = (rule: NumberRule) => z.preprocess(toNumber, numberSchema(rule).optional());

export const RepsInputSchema = z.object({
  sets: required({ label: 'Sets', min: 1, max: 100, int: true }),
  reps: required({ label: 'Reps', min: 1, max: 1000, int: true }),
  weight: optional({ label: 'Weight', min: 0, max: 2000 }),
});

export const DistanceInputSchema = z.object({
  distance: required({ label: 'Distance', min: 0.1, max: 200 }),
});

export const LapsInputSchema = z.object({
  laps: required({ label: 'Laps', min: 1, max: 1000, int: true }),
});

export const SessionInputSchema = z.object({
  sessions: required({ label: 'Sessions', min: 1, max: 20, int: true }),
  duration: optional({ label: 'Duration', min: 1, max: 1440, int: true }),
});

export const WeightInputSchema = z.object({
  currentWeight: required({ label: 'Current weight', min: 20, max: 1500 }),
});

export const MealInputSchema = z.object({
  meals: required({ label: 'Healthy meals', min: 1, max: 10, int: true }),
  description: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(200, 'Description must be 200 characters or fewer.').optional(),
  ),
});

/** Validates what the player types into each exercise form, keyed by the stat's XP type. */
export const EXERCISE_INPUT_SCHEMAS = {
  reps: RepsInputSchema,
  distance: DistanceInputSchema,
  laps: LapsInputSchema,
  session: SessionInputSchema,
  weight: WeightInputSchema,
  meal: MealInputSchema,
} satisfies Record<XpType, z.ZodType>;

export type ExerciseInput = z.output<(typeof EXERCISE_INPUT_SCHEMAS)[XpType]>;
