import { describe, expect, it } from 'vitest';
import { CharacterFormSchema, STEP_FIELDS } from '@/features/character/schema';

const valid = { name: 'Aragorn', gender: 'male', age: '30', weight: '180.5', weightUnit: 'lbs' };

function firstMessage(input: Record<string, unknown>): string | undefined {
  const result = CharacterFormSchema.safeParse(input);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe('CharacterFormSchema', () => {
  it('accepts valid input, trimming the name and coercing numbers', () => {
    const result = CharacterFormSchema.safeParse({ ...valid, name: '  Aragorn  ' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'Aragorn', gender: 'male', age: 30, weight: 180.5, weightUnit: 'lbs' });
  });

  it('accepts a 20-character name and boundary ages', () => {
    expect(CharacterFormSchema.safeParse({ ...valid, name: 'a'.repeat(20) }).success).toBe(true);
    expect(CharacterFormSchema.safeParse({ ...valid, age: '1' }).success).toBe(true);
    expect(CharacterFormSchema.safeParse({ ...valid, age: '120' }).success).toBe(true);
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(firstMessage({ ...valid, name: '' })).toBe('Please enter your name.');
    expect(firstMessage({ ...valid, name: '   ' })).toBe('Please enter your name.');
  });

  it('rejects a 21-character name', () => {
    expect(firstMessage({ ...valid, name: 'a'.repeat(21) })).toBe('Name must be 20 characters or fewer.');
  });

  it('rejects age 0, 121, a non-integer and a non-number', () => {
    expect(firstMessage({ ...valid, age: '0' })).toBe('Please enter a valid age.');
    expect(firstMessage({ ...valid, age: '121' })).toBe('Please enter a valid age.');
    expect(firstMessage({ ...valid, age: '30.5' })).toBe('Age must be a whole number.');
    expect(firstMessage({ ...valid, age: 'abc' })).toBe('Please enter a valid age.');
  });

  it('rejects weight 0 and negative weight', () => {
    expect(firstMessage({ ...valid, weight: '0' })).toBe('Please enter a valid weight.');
    expect(firstMessage({ ...valid, weight: '-10' })).toBe('Please enter a valid weight.');
  });

  it('rejects a missing or unknown gender', () => {
    expect(firstMessage({ ...valid, gender: '' })).toBe('Please select a gender.');
    const noGender: Record<string, unknown> = { ...valid };
    delete noGender.gender;
    expect(firstMessage(noGender)).toBe('Please select a gender.');
  });

  it('rejects an unknown weight unit', () => {
    expect(CharacterFormSchema.safeParse({ ...valid, weightUnit: 'stone' }).success).toBe(false);
  });

  it('assigns every form field to exactly one step', () => {
    const stepFields: string[] = STEP_FIELDS.flat();
    expect(stepFields.sort()).toEqual(Object.keys(CharacterFormSchema.shape).sort());
  });
});
