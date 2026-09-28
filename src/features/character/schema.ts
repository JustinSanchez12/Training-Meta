import { z } from 'zod';
import { GenderSchema, WeightUnitSchema } from '@/lib/game/schema';

/** Wizard input. Age and weight arrive as strings from <input type="number"> and are coerced. */
export const CharacterFormSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name.').max(20, 'Name must be 20 characters or fewer.'),
  gender: z.enum(GenderSchema.options, { error: 'Please select a gender.' }),
  age: z.coerce
    .number({ error: 'Please enter a valid age.' })
    .int('Age must be a whole number.')
    .min(1, 'Please enter a valid age.')
    .max(120, 'Please enter a valid age.'),
  weight: z.coerce
    .number({ error: 'Please enter a valid weight.' })
    .positive('Please enter a valid weight.')
    .max(2000, 'Please enter a valid weight.'),
  weightUnit: WeightUnitSchema,
});

export type CharacterForm = z.output<typeof CharacterFormSchema>;

/** Which fields each wizard step validates, in order. */
export const STEP_FIELDS = [['name'], ['gender'], ['age'], ['weight', 'weightUnit']] as const;
