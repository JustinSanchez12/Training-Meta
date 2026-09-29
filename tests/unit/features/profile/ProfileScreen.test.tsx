import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSION_KEY, saveSession } from '@/features/workout/sessionStorage';
import { legacySave } from '../../fixtures/saves';
import {
  createMemoryRepository,
  goTo,
  location,
  logExercise,
  pendingSave,
  renderWorkout,
} from '../workout/renderWorkout';

const resetButton = () => screen.getByRole('button', { name: 'Reset Character' });
const dialog = () => screen.getByRole('dialog', { name: 'Reset character?' });

describe('ProfileScreen', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the player details and the current weight goal', async () => {
    renderWorkout(createMemoryRepository(legacySave()), '/profile');
    expect(await screen.findByRole('heading', { name: '👤 Profile' })).toBeInTheDocument();
    expect(screen.getByText('Aragorn')).toBeInTheDocument();
    const rows: [string, string][] = [
      ['Gender', 'Male'],
      ['Age', '30'],
      ['Starting Weight', '180 lbs'],
      ['Current Weight', '178.5 lbs'],
      ['Workouts Logged', '1'],
    ];
    for (const [term, value] of rows) {
      expect(screen.getByText(term, { selector: 'dt' }).nextElementSibling).toHaveTextContent(value);
    }
    expect(screen.getByRole('radio', { name: 'Lose' })).toBeChecked();
  });

  it('saves a goal change immediately', async () => {
    const repo = createMemoryRepository(legacySave());
    const user = renderWorkout(repo, '/profile');
    await user.click(await screen.findByRole('radio', { name: 'Gain' }));
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Gain' })).toBeChecked());
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save.mock.calls[0]?.[0].player.weightGoal).toBe('gain');
  });

  it('Cancel and Escape close the dialog and keep the save', async () => {
    const repo = createMemoryRepository(legacySave());
    const user = renderWorkout(repo, '/profile');
    await user.click(await screen.findByRole('button', { name: 'Reset Character' }));
    expect(within(dialog()).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(resetButton());
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(repo.clear).not.toHaveBeenCalled();
    expect(location()).toHaveTextContent('/profile');
    expect(screen.getByText('Aragorn')).toBeInTheDocument();
  });

  it('Reset clears the save and the draft, lands on Start and focuses its heading', async () => {
    const save = legacySave();
    saveSession(sessionStorage, save.player.createdAt, [
      { id: 'd1', entry: { stat: 'yoga', name: 'Yoga', icon: '🧘', data: {}, xpGained: 10, timestamp: save.player.createdAt } },
    ]);
    const repo = createMemoryRepository(save);
    const user = renderWorkout(repo, '/profile');
    await user.click(await screen.findByRole('button', { name: 'Reset Character' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Reset' }));

    const start = await screen.findByRole('heading', { name: 'Start stub' });
    expect(location()).toHaveTextContent(/^\/$/);
    expect(repo.clear).toHaveBeenCalledTimes(1);
    await expect(repo.load()).resolves.toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    await waitFor(() => expect(start).toHaveFocus());
  });

  it('shows an error in the dialog when the reset fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const repo = createMemoryRepository(legacySave());
    repo.clear.mockRejectedValueOnce(new Error('denied'));
    const user = renderWorkout(repo, '/profile');
    await user.click(await screen.findByRole('button', { name: 'Reset Character' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Reset' }));
    expect(await within(dialog()).findByRole('alert')).toHaveTextContent("Couldn't reset your character. Try again.");
    expect(within(dialog()).getByRole('button', { name: 'Reset' })).toBeEnabled();
    expect(location()).toHaveTextContent('/profile');
  });

  // jsdom doesn't drop focus from a disabled element; the real guard for this is tests/e2e/log-profile.spec.ts.
  it('keeps keyboard focus on the goal radio while the change saves', async () => {
    const repo = createMemoryRepository(legacySave());
    const user = renderWorkout(repo);
    await screen.findByRole('navigation', { name: 'Test navigation' });
    await goTo(user, 'Profile');
    const lose = await screen.findByRole('radio', { name: 'Lose' });
    lose.focus();
    await user.keyboard('{ArrowRight}');
    const gain = screen.getByRole('radio', { name: 'Gain' });
    await waitFor(() => expect(gain).toBeChecked());
    expect(gain).toHaveFocus();
    expect(gain).toBeEnabled();
  });

  it('disables the goal radios and Reset while a workout is being saved', async () => {
    const repo = createMemoryRepository(legacySave());
    const saving = pendingSave(repo);
    const user = renderWorkout(repo);
    await logExercise(user, 'Bench Press', { '^sets': '3', '^reps': '10' });
    await user.click(screen.getByRole('button', { name: /finish/i }));

    await goTo(user, 'Profile');
    const gain = await screen.findByRole('radio', { name: 'Gain' });
    expect(gain).toBeDisabled();
    await user.click(resetButton());
    const reset = within(dialog()).getByRole('button', { name: 'Reset' });
    expect(reset).toHaveAttribute('aria-disabled', 'true');
    expect(within(dialog()).getByText('A workout is being saved. Try again in a moment.')).toBeInTheDocument();

    await act(async () => saving().resolve());
    await waitFor(() => expect(reset).not.toHaveAttribute('aria-disabled'));
    expect(gain).toBeEnabled();
    expect(repo.clear).not.toHaveBeenCalled();
  });
});
