import type { WeightUnit } from '@/lib/game/schema';
import type { XpType } from '@/lib/game/stats';

export interface FieldConfig {
  id: string;
  label: string;
  type: 'number' | 'text';
  placeholder: string;
  step?: number;
  optional?: boolean;
}

/** Form fields per XP type (same fields and placeholders as legacy). Lift and body weights use the player's unit. */
export function getExerciseFields(xpType: XpType, unit: WeightUnit): FieldConfig[] {
  switch (xpType) {
    case 'reps':
      return [
        { id: 'sets', label: 'Sets', type: 'number', placeholder: '4' },
        { id: 'reps', label: 'Reps', type: 'number', placeholder: '8' },
        { id: 'weight', label: `Weight (${unit})`, type: 'number', placeholder: '135', step: 0.5, optional: true },
      ];
    case 'distance':
      return [{ id: 'distance', label: 'Distance (miles)', type: 'number', placeholder: '1', step: 0.1 }];
    case 'laps':
      return [{ id: 'laps', label: 'Laps', type: 'number', placeholder: '10' }];
    case 'session':
      return [
        { id: 'sessions', label: 'Sessions', type: 'number', placeholder: '1' },
        { id: 'duration', label: 'Duration (min)', type: 'number', placeholder: '30', optional: true },
      ];
    case 'weight':
      return [{ id: 'currentWeight', label: `Current Weight (${unit})`, type: 'number', placeholder: '175', step: 0.1 }];
    case 'meal':
      return [
        { id: 'meals', label: 'Healthy Meals', type: 'number', placeholder: '3' },
        { id: 'description', label: 'Description', type: 'text', placeholder: 'Grilled chicken, rice, vegetables', optional: true },
      ];
  }
}
