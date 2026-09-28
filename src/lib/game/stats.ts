export const STAT_ORDER = [
  'benchPress',
  'squat',
  'deadlift',
  'overheadPress',
  'bicepCurl',
  'pullUp',
  'mileRun',
  'cycling',
  'swimming',
  'yoga',
  'weight',
  'nutrition',
] as const;

export type StatKey = (typeof STAT_ORDER)[number];

export type StatCategory = 'strength' | 'cardio' | 'flexibility' | 'body';
export type XpType = 'reps' | 'distance' | 'laps' | 'session' | 'weight' | 'meal';

export interface StatDefinition {
  name: string;
  icon: string;
  category: StatCategory;
  xpType: XpType;
  xpDescription: string;
  color: string;
}

export const MAX_LEVEL = 99;

/** "strength" → "Strength" */
export function formatCategory(category: StatCategory): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export const STAT_DEFINITIONS: Record<StatKey, StatDefinition> = {
  benchPress: { name: 'Bench Press', icon: '🏋️', category: 'strength', xpType: 'reps', xpDescription: 'sets × reps = XP', color: '#e74c3c' },
  squat: { name: 'Squat', icon: '🦵', category: 'strength', xpType: 'reps', xpDescription: 'sets × reps = XP', color: '#e67e22' },
  deadlift: { name: 'Deadlift', icon: '💪', category: 'strength', xpType: 'reps', xpDescription: 'sets × reps = XP', color: '#c0392b' },
  overheadPress: { name: 'OHP', icon: '🙌', category: 'strength', xpType: 'reps', xpDescription: 'sets × reps = XP', color: '#d35400' },
  bicepCurl: { name: 'Bicep Curl', icon: '💪', category: 'strength', xpType: 'reps', xpDescription: 'sets × reps = XP', color: '#e74c3c' },
  pullUp: { name: 'Pull Up', icon: '🧗', category: 'strength', xpType: 'reps', xpDescription: 'sets × reps = XP', color: '#c0392b' },
  mileRun: { name: 'Mile Run', icon: '🏃', category: 'cardio', xpType: 'distance', xpDescription: '1 mile = 10 XP', color: '#3498db' },
  cycling: { name: 'Cycling', icon: '🚴', category: 'cardio', xpType: 'distance', xpDescription: '1 mile = 5 XP', color: '#2980b9' },
  swimming: { name: 'Swimming', icon: '🏊', category: 'cardio', xpType: 'laps', xpDescription: '1 lap = 5 XP', color: '#1abc9c' },
  yoga: { name: 'Yoga', icon: '🧘', category: 'flexibility', xpType: 'session', xpDescription: '1 session = 10 XP', color: '#9b59b6' },
  weight: { name: 'Weight', icon: '⚖️', category: 'body', xpType: 'weight', xpDescription: 'Lose 0.5+ lb (0.23 kg) since last weigh-in = 10 XP', color: '#f39c12' },
  nutrition: { name: 'Nutrition', icon: '🥗', category: 'body', xpType: 'meal', xpDescription: '1 healthy meal = 5 XP', color: '#27ae60' },
};
