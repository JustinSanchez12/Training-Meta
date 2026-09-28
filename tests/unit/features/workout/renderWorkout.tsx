import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { PlayerProvider } from '@/app/PlayerProvider';
import { ExerciseForm } from '@/features/workout/ExerciseForm';
import { WorkoutLayout } from '@/features/workout/WorkoutLayout';
import { WorkoutScreen } from '@/features/workout/WorkoutScreen';
import type { SaveData } from '@/lib/game/schema';
import type { SaveRepository } from '@/lib/storage';
import { LocationProbe, WaitForLoad } from './TestHarness';

export function createMemoryRepository(initial: SaveData | null = null) {
  let stored = initial;
  return {
    load: vi.fn(async () => stored),
    save: vi.fn(async (data: SaveData) => {
      stored = data;
    }),
    clear: vi.fn(async () => {
      stored = null;
    }),
  } satisfies SaveRepository;
}

export const NOW = new Date(2026, 8, 28, 23, 30);

/** Renders the /workout routes exactly as App registers them, plus Start and Hub stubs. */
export function renderWorkout(repository: SaveRepository, initialPath = '/workout') {
  const user = userEvent.setup();
  render(
    <PlayerProvider repository={repository} now={() => NOW}>
      <MemoryRouter initialEntries={[initialPath]}>
        <WaitForLoad>
          <Routes>
            <Route path="/" element={<h1>Start stub</h1>} />
            <Route path="/hub" element={<h1>Hub stub</h1>} />
            <Route path="/workout" element={<WorkoutLayout />}>
              <Route index element={<WorkoutScreen />} />
              <Route path=":stat" element={<ExerciseForm />} />
            </Route>
          </Routes>
          <LocationProbe />
        </WaitForLoad>
      </MemoryRouter>
    </PlayerProvider>,
  );
  return user;
}

export type User = ReturnType<typeof userEvent.setup>;

export const location = () => screen.getByTestId('location');

/** From /workout: open an exercise, fill its fields by label, and submit. */
export async function logExercise(user: User, exercise: string, fields: Record<string, string>) {
  const chooser = await screen.findByRole('region', { name: /choose exercise/i });
  await user.click(within(chooser).getByRole('button', { name: exercise }));
  for (const [label, value] of Object.entries(fields)) {
    await user.type(screen.getByLabelText(new RegExp(label, 'i')), value);
  }
  await user.click(screen.getByRole('button', { name: /log exercise/i }));
  await screen.findByRole('heading', { name: /current session/i });
}
