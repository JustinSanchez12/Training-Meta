import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { PlayerProvider } from '@/app/PlayerProvider';
import { ExerciseForm } from '@/features/workout/ExerciseForm';
import { WorkoutLayout } from '@/features/workout/WorkoutLayout';
import { WorkoutScreen } from '@/features/workout/WorkoutScreen';
import { WorkoutSessionProvider } from '@/features/workout/WorkoutSessionProvider';
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

export type MemoryRepository = ReturnType<typeof createMemoryRepository>;

/** Makes the next repo.save() hang until the returned handle settles it. */
export function pendingSave(repo: MemoryRepository) {
  let settle: { resolve(): void; reject(error: Error): void } | undefined;
  repo.save.mockImplementationOnce(
    () =>
      new Promise<void>((resolve, reject) => {
        settle = { resolve, reject };
      }),
  );
  return () => {
    if (!settle) throw new Error('save() was not called');
    return settle;
  };
}

export const NOW = new Date(2026, 8, 28, 23, 30);

interface RenderWorkoutOptions {
  /** Passed to WorkoutSessionProvider; defaults to jsdom's sessionStorage. */
  storage?: Storage | null;
  /** Element for /hub; defaults to a stub heading. */
  hub?: ReactNode;
}

/** Renders the /workout routes exactly as App registers them (provider above <Routes>), plus stubs. */
export function renderWorkout(repository: SaveRepository, initialPath = '/workout', options: RenderWorkoutOptions = {}) {
  const user = userEvent.setup();
  const providerProps = 'storage' in options ? { storage: options.storage } : {};
  render(
    <PlayerProvider repository={repository} now={() => NOW}>
      <MemoryRouter initialEntries={[initialPath]}>
        <WaitForLoad>
          <WorkoutSessionProvider {...providerProps}>
            <Routes>
              <Route path="/" element={<h1>Start stub</h1>} />
              <Route path="/hub" element={options.hub ?? <h1>Hub stub</h1>} />
              <Route path="/stats" element={<h1>Stats stub</h1>} />
              <Route path="/workout" element={<WorkoutLayout />}>
                <Route index element={<WorkoutScreen />} />
                <Route path=":stat" element={<ExerciseForm />} />
              </Route>
            </Routes>
            <LocationProbe />
            {/* Lets tests leave /workout mid-save (the screen's own controls are disabled then). */}
            <nav aria-label="Test navigation">
              <Link to="/stats">Test: go to Stats</Link>
              <Link to="/workout">Test: go to Workout</Link>
            </nav>
          </WorkoutSessionProvider>
        </WaitForLoad>
      </MemoryRouter>
    </PlayerProvider>,
  );
  return user;
}

export type User = ReturnType<typeof userEvent.setup>;

export const location = () => screen.getByTestId('location');

/** Navigates via the harness's test links (outside the routes). */
export async function goTo(user: User, where: 'Stats' | 'Workout') {
  const nav = screen.getByRole('navigation', { name: 'Test navigation' });
  await user.click(within(nav).getByRole('link', { name: `Test: go to ${where}` }));
}

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
