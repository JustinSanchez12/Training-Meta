import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SaveData } from '@/lib/game/schema';
import { legacySave } from '../../fixtures/saves';
import { createMemoryRepository, location, renderWorkout } from './renderWorkout';

const logButton = () => screen.getByRole('button', { name: /log exercise/i });
/** The form's own error summary; WorkoutLayout also has a status region (the XP announcement). */
const formStatus = () => {
  const form = logButton().closest('form');
  if (!form) throw new Error('form not found');
  return within(form).getByRole('status');
};

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
    ['weight', ['Current Weight (lbs)'], 'Lose 0.5+ lb (0.23 kg) since last weigh-in = 10 XP'],
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

  it('renders the error before focus moves, so the field is already invalid and described when focused', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout/benchPress');
    await screen.findByRole('button', { name: /log exercise/i });
    const reps = screen.getByLabelText(/^reps/i);
    await user.type(screen.getByLabelText(/^sets/i), '3');

    let atFocus: { invalid: string | null; description: string | null } | undefined;
    reps.addEventListener('focus', () => {
      const describedBy = reps.getAttribute('aria-describedby');
      atFocus = {
        invalid: reps.getAttribute('aria-invalid'),
        description: describedBy ? (document.getElementById(describedBy)?.textContent ?? null) : null,
      };
    });
    await user.click(logButton());

    expect(atFocus).toEqual({ invalid: 'true', description: 'Please enter reps.' });
  });

  it('announces a summary in a polite status region, including when Enter is pressed in the focused field', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout/benchPress');
    const sets = await screen.findByLabelText(/^sets/i);
    await user.click(logButton());
    expect(formStatus()).toHaveTextContent('2 fields need fixing.');

    await user.type(screen.getByLabelText(/^reps/i), '5');
    sets.focus();
    await user.keyboard('{Enter}');
    expect(sets).toHaveFocus();
    expect(formStatus()).toHaveTextContent('1 field needs fixing.');
  });

  it('describes each invalid field by its error (no alerts) and focuses the first invalid field', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout/benchPress');
    await user.click(await screen.findByRole('button', { name: /log exercise/i }));
    const sets = screen.getByLabelText(/^sets/i);
    const reps = screen.getByLabelText(/^reps/i);
    const weight = screen.getByLabelText(/weight \(lbs\)/i);
    // Field errors are described, not announced all at once.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(sets).toHaveAttribute('aria-invalid', 'true');
    expect(sets).toHaveAccessibleDescription('Please enter sets.');
    expect(reps).toHaveAttribute('aria-invalid', 'true');
    expect(reps).toHaveAccessibleDescription('Please enter reps.');
    expect(weight).not.toHaveAttribute('aria-invalid');
    expect(weight).not.toHaveAttribute('aria-describedby');
    expect(sets).toHaveFocus();
    expect(location()).toHaveTextContent('/workout/benchPress');
  });

  it('focuses the first invalid field in form order, even when an earlier field is valid', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout/benchPress');
    await user.type(await screen.findByLabelText(/^sets/i), '3');
    await user.type(screen.getByLabelText(/weight \(lbs\)/i), '-5');
    // Move focus away so the assertion proves the form moved it.
    await user.click(screen.getByRole('button', { name: /log exercise/i }));
    expect(screen.getByLabelText(/^sets/i)).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText(/^reps/i)).toHaveFocus();
    expect(screen.getByLabelText(/^reps/i)).toHaveAccessibleDescription('Please enter reps.');
    expect(screen.getByLabelText(/weight \(lbs\)/i)).toHaveAccessibleDescription('Weight must be between 0 and 2000.');
  });

  it('rejects out-of-range and fractional values', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout/benchPress');
    await user.type(await screen.findByLabelText(/^sets/i), '101');
    await user.type(screen.getByLabelText(/^reps/i), '1.5');
    await user.click(logButton());
    expect(screen.getByLabelText(/^sets/i)).toHaveAccessibleDescription('Sets must be between 1 and 100.');
    expect(screen.getByLabelText(/^reps/i)).toHaveAccessibleDescription('Reps must be a whole number.');
    expect(screen.getByLabelText(/^sets/i)).toHaveFocus();
    expect(location()).toHaveTextContent('/workout/benchPress');
  });

  it('rejects 0.05 miles', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout/mileRun');
    await user.type(await screen.findByLabelText(/distance/i), '0.05');
    await user.click(logButton());
    const distance = screen.getByLabelText(/distance/i);
    expect(distance).toHaveAccessibleDescription('Distance must be between 0.1 and 200.');
    expect(distance).toHaveAttribute('aria-invalid', 'true');
    expect(distance).toHaveFocus();
  });

  it('clears a field error when that field changes', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout/benchPress');
    await user.click(await screen.findByRole('button', { name: /log exercise/i }));
    expect(screen.getByText('Please enter sets.')).toBeInTheDocument();
    expect(screen.getByText('Please enter reps.')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^sets/i), '3');
    expect(screen.queryByText('Please enter sets.')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^sets/i)).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText(/^sets/i)).not.toHaveAttribute('aria-describedby');
    expect(screen.getByLabelText(/^reps/i)).toHaveAccessibleDescription('Please enter reps.');
  });

  it('logs a valid entry (optional weight left blank) and returns to /workout', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout/benchPress');
    await user.type(await screen.findByLabelText(/^sets/i), '3');
    await user.type(screen.getByLabelText(/^reps/i), '10');
    await user.click(logButton());
    expect(await screen.findByText('Total: +30 XP (1 exercise)')).toBeInTheDocument();
    expect(location()).toHaveTextContent(/^\/workout$/);
  });

  it('shows the +XP popup and announces the gain after logging', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout/benchPress');
    await user.type(await screen.findByLabelText(/^sets/i), '3');
    await user.type(screen.getByLabelText(/^reps/i), '10');
    await user.click(logButton());
    expect(await screen.findByText('Total: +30 XP (1 exercise)')).toBeInTheDocument();
    // The popup is decorative (aria-hidden); the status region carries the announcement.
    const popup = document.querySelector('.xp-popup');
    expect(popup).toHaveTextContent('+30 XPBench Press');
    expect(popup).toHaveAttribute('aria-hidden', 'true');
    // Set on the next animation frame (cleared first so identical text is re-announced).
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Added Bench Press, +30 XP. Session total 30 XP.'),
    );
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

  it('shows the Gain rule and awards XP for a gain when the goal is gain', async () => {
    const save = legacySave();
    save.player = { ...save.player, weightGoal: 'gain' };
    const user = renderWorkout(createMemoryRepository(save), '/workout/weight');
    expect(await screen.findByText('Gain 0.5+ lb (0.23 kg) since last weigh-in = 10 XP')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/current weight/i), '179.5');
    await user.click(logButton());
    expect(await screen.findByText('Total: +10 XP (1 exercise)')).toBeInTheDocument();
  });

  it('Back returns to /workout without adding anything', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout/benchPress');
    await user.type(await screen.findByLabelText(/^sets/i), '3');
    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(await screen.findByText('Total: +0 XP (0 exercises)')).toBeInTheDocument();
    expect(location()).toHaveTextContent(/^\/workout$/);
  });
});
