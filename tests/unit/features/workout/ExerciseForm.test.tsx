import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SaveData } from '@/lib/game/schema';
import { legacySave } from '../../fixtures/saves';
import { createMemoryRepository, location, renderWorkout } from './renderWorkout';

const logButton = () => screen.getByRole('button', { name: /log exercise/i });

function kgSave(): SaveData {
  const save = legacySave();
  save.player = { ...save.player, weightUnit: 'kg', startWeight: 80, currentWeight: 80 };
  return save;
}

describe('ExerciseForm', () => {
  it('shows Back, the icon and name, the XP rule and the reps fields', async () => {
    renderWorkout(createMemoryRepository(legacySave()), '/workout/benchPress');
    expect(await screen.findByRole('heading', { name: '🏋️ Bench Press' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(screen.getByText('sets × reps = XP')).toBeInTheDocument();
    expect(screen.getByLabelText(/^sets/i)).toHaveFocus();
    expect(screen.getByLabelText(/^reps/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/weight \(lbs\)/i)).toBeInTheDocument();
    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });

  it.each([
    ['mileRun', ['Distance (miles)'], '1 mile = 10 XP'],
    ['swimming', ['Laps'], '1 lap = 5 XP'],
    ['yoga', ['Sessions', 'Duration (min)'], '1 session = 10 XP'],
    ['weight', ['Current Weight (lbs)'], '0.5-1 lb toward goal = 10 XP'],
    ['nutrition', ['Healthy Meals', 'Description'], '1 healthy meal = 5 XP'],
  ])('/workout/%s shows its fields', async (stat, labels, rule) => {
    renderWorkout(createMemoryRepository(legacySave()), `/workout/${stat}`);
    expect(await screen.findByText(rule)).toBeInTheDocument();
    for (const label of labels) {
      expect(screen.getByLabelText(new RegExp(`^${label.replace(/[()]/g, '\\$&')}`))).toBeInTheDocument();
    }
  });

  it('labels weight fields in the player unit', async () => {
    renderWorkout(createMemoryRepository(kgSave()), '/workout/weight');
    expect(await screen.findByLabelText(/current weight \(kg\)/i)).toBeInTheDocument();
  });

  it('shows inline errors for empty required fields and stays on the form', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout/benchPress');
    await user.click(await screen.findByRole('button', { name: /log exercise/i }));
    const alerts = screen.getAllByRole('alert');
    expect(alerts.map((a) => a.textContent)).toEqual(['Please enter sets.', 'Please enter reps.']);
    expect(screen.getByLabelText(/^sets/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^sets/i)).toHaveAccessibleDescription('Please enter sets.');
    expect(screen.getByLabelText(/weight \(lbs\)/i)).not.toHaveAttribute('aria-invalid');
    expect(location()).toHaveTextContent('/workout/benchPress');
  });

  it('rejects out-of-range and fractional values', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout/benchPress');
    await user.type(await screen.findByLabelText(/^sets/i), '101');
    await user.type(screen.getByLabelText(/^reps/i), '1.5');
    await user.click(logButton());
    expect(screen.getByText('Sets must be between 1 and 100.')).toBeInTheDocument();
    expect(screen.getByText('Reps must be a whole number.')).toBeInTheDocument();
    expect(location()).toHaveTextContent('/workout/benchPress');
  });

  it('rejects 0.05 miles', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout/mileRun');
    await user.type(await screen.findByLabelText(/distance/i), '0.05');
    await user.click(logButton());
    expect(screen.getByRole('alert')).toHaveTextContent('Distance must be between 0.1 and 200.');
  });

  it('clears a field error when that field changes', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout/benchPress');
    await user.click(await screen.findByRole('button', { name: /log exercise/i }));
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    await user.type(screen.getByLabelText(/^sets/i), '3');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter reps.');
  });

  it('logs a valid entry (optional weight left blank) and returns to /workout', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout/benchPress');
    await user.type(await screen.findByLabelText(/^sets/i), '3');
    await user.type(screen.getByLabelText(/^reps/i), '10');
    await user.click(logButton());
    expect(await screen.findByText('Total: +30 XP (1 exercise)')).toBeInTheDocument();
    expect(location()).toHaveTextContent(/^\/workout$/);
  });

  it('awards Weight XP for a 0.3 kg loss in kg', async () => {
    const user = renderWorkout(createMemoryRepository(kgSave()), '/workout/weight');
    await user.type(await screen.findByLabelText(/current weight/i), '79.7');
    await user.click(logButton());
    expect(await screen.findByText(/Weight — 79\.7 kg/)).toBeInTheDocument();
    expect(screen.getByText('Total: +10 XP (1 exercise)')).toBeInTheDocument();
  });

  it('gives 0 XP for a gain', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout/weight');
    await user.type(await screen.findByLabelText(/current weight/i), '181');
    await user.click(logButton());
    expect(await screen.findByText('Total: +0 XP (1 exercise)')).toBeInTheDocument();
  });

  it('Back returns to /workout without adding anything', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout/benchPress');
    await user.type(await screen.findByLabelText(/^sets/i), '3');
    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(await screen.findByText('Total: +0 XP (0 exercises)')).toBeInTheDocument();
    expect(location()).toHaveTextContent(/^\/workout$/);
  });
});
