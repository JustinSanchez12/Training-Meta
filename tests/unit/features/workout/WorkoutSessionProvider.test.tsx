import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLayoutEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerProvider } from '@/app/PlayerProvider';
import { usePlayer, type PlayerContextValue } from '@/app/playerContext';
import { HubScreen } from '@/features/hub/HubScreen';
import type { SessionItem } from '@/features/workout/schema';
import { useWorkoutSession, type WorkoutSession } from '@/features/workout/sessionContext';
import { SESSION_KEY, saveSession } from '@/features/workout/sessionStorage';
import { WorkoutSessionProvider } from '@/features/workout/WorkoutSessionProvider';
import { SaveDataSchema, type ExerciseEntry } from '@/lib/game/schema';
import type { WorkoutResult } from '@/lib/game/workout';
import { legacySave } from '../../fixtures/saves';
import { createMemoryRepository, logExercise, pendingSave, renderWorkout, type MemoryRepository } from './renderWorkout';
import { WaitForLoad } from './TestHarness';

const OWNER = legacySave().player.createdAt;

function entry(stat: ExerciseEntry['stat'], name: string, xpGained: number): ExerciseEntry {
  return { stat, name, icon: '•', data: {}, xpGained, timestamp: '2026-09-28T12:00:00.000Z' };
}

const bench = entry('benchPress', 'Bench Press', 30);
const swim = entry('swimming', 'Swimming', 20);
const stored: SessionItem[] = [
  { id: 'stored-1', entry: bench },
  { id: 'stored-2', entry: swim },
];

const readStored = () =>
  JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as { owner: string; items: SessionItem[] } | null;

interface Captured {
  session: WorkoutSession | null;
  player: PlayerContextValue | null;
  /** items.length on every render, in order: proves what the very first render saw. */
  renders: number[];
}

function renderProvider(repo: MemoryRepository, storage: Storage | null = sessionStorage) {
  const captured: Captured = { session: null, player: null, renders: [] };
  function Probe() {
    const session = useWorkoutSession();
    const player = usePlayer();
    captured.renders.push(session.items.length);
    useLayoutEffect(() => {
      captured.session = session;
      captured.player = player;
    });
    return (
      <p>
        {session.items.length} items{session.finishing ? ', finishing' : ''}
        {session.finishError ? `, error: ${session.finishError}` : ''}
      </p>
    );
  }
  render(
    <PlayerProvider repository={repo}>
      <MemoryRouter>
        <WaitForLoad>
          <WorkoutSessionProvider storage={storage}>
            <Probe />
          </WorkoutSessionProvider>
        </WaitForLoad>
      </MemoryRouter>
    </PlayerProvider>,
  );
  return {
    captured,
    session: () => {
      if (!captured.session) throw new Error('session not captured');
      return captured.session;
    },
    player: () => {
      if (!captured.player) throw new Error('player not captured');
      return captured.player;
    },
  };
}

describe('WorkoutSessionProvider', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('hydration and persistence', () => {
    it('restores a stored draft on its first render, and the first persist does not clobber it', async () => {
      saveSession(sessionStorage, OWNER, stored);
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      const removeItem = vi.spyOn(Storage.prototype, 'removeItem');

      const { captured, session } = renderProvider(createMemoryRepository(legacySave()));
      expect(await screen.findByText('2 items')).toBeInTheDocument();
      // Never rendered an empty session first.
      expect(captured.renders.length).toBeGreaterThan(0);
      expect(captured.renders.every((n) => n === 2)).toBe(true);
      expect(session().items).toEqual(stored);

      // Nothing was written over the draft, and it's still there.
      expect(removeItem).not.toHaveBeenCalled();
      for (const [key, value] of setItem.mock.calls) {
        if (key === SESSION_KEY) expect(JSON.parse(value).items).toEqual(stored);
      }
      expect(readStored()?.items).toEqual(stored);
    });

    it('discards a draft stored for another character', async () => {
      saveSession(sessionStorage, 'another-character', stored);
      renderProvider(createMemoryRepository(legacySave()));
      expect(await screen.findByText('0 items')).toBeInTheDocument();
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('discards a corrupt draft', async () => {
      sessionStorage.setItem(SESSION_KEY, '{nope');
      renderProvider(createMemoryRepository(legacySave()));
      expect(await screen.findByText('0 items')).toBeInTheDocument();
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('persists each change for the current owner', async () => {
      const { session } = renderProvider(createMemoryRepository(legacySave()));
      await screen.findByText('0 items');
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();

      let added: { item: SessionItem; totalXp: number } | undefined;
      act(() => {
        added = session().addEntry(bench);
      });
      act(() => {
        added = session().addEntry(swim);
      });
      expect(added?.totalXp).toBe(50);
      expect(added?.item.entry).toBe(swim);
      expect(readStored()).toEqual({ version: 1, owner: OWNER, items: session().items });

      act(() => session().removeItem(session().items[0]!.id));
      expect(readStored()?.items.map((i) => i.entry.name)).toEqual(['Swimming']);
      act(() => session().removeItem(session().items[0]!.id));
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('gives every item a unique id, even for identical entries', async () => {
      const { session } = renderProvider(createMemoryRepository(legacySave()));
      await screen.findByText('0 items');
      act(() => {
        session().addEntry(bench);
      });
      act(() => {
        session().addEntry(bench);
      });
      const [first, second] = session().items;
      expect(first?.id).toBeTruthy();
      expect(first?.id).not.toBe(second?.id);

      act(() => session().removeItem(second!.id));
      expect(session().items).toEqual([first]);
    });

    it('replaces an earlier weigh-in (one Weight entry per session)', async () => {
      const { session } = renderProvider(createMemoryRepository(legacySave()));
      await screen.findByText('0 items');
      act(() => {
        session().addEntry(entry('weight', 'Weight', 10));
      });
      act(() => {
        session().addEntry(bench);
      });
      let result: { totalXp: number } | undefined;
      act(() => {
        result = session().addEntry(entry('weight', 'Weight', 0));
      });
      expect(session().items.map((i) => [i.entry.stat, i.entry.xpGained])).toEqual([
        ['benchPress', 30],
        ['weight', 0],
      ]);
      expect(result?.totalXp).toBe(30);
    });

    it('works in memory when storage is unavailable', async () => {
      const { session } = renderProvider(createMemoryRepository(legacySave()), null);
      await screen.findByText('0 items');
      act(() => {
        session().addEntry(bench);
      });
      expect(screen.getByText('1 items')).toBeInTheDocument();
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('re-hydrates when the character changes (none → created)', async () => {
      const createdAt = new Date('2026-09-28T10:00:00.000Z');
      vi.useFakeTimers({ toFake: ['Date'], now: createdAt });
      // A draft already stored for the character about to be created.
      saveSession(sessionStorage, createdAt.toISOString(), stored);

      const { session, player } = renderProvider(createMemoryRepository(null));
      expect(await screen.findByText('0 items')).toBeInTheDocument();
      // With no character, nothing is loaded and the draft is left alone.
      expect(readStored()?.items).toEqual(stored);

      await act(async () => {
        await player().createCharacter({ name: 'Link', gender: 'male', age: 17, weight: 60, weightUnit: 'kg' });
      });
      expect(await screen.findByText('2 items')).toBeInTheDocument();
      expect(session().items).toEqual(stored);
    });
  });

  describe('finish()', () => {
    it('with an empty session returns null, sets the error and saves nothing', async () => {
      const repo = createMemoryRepository(legacySave());
      const { session } = renderProvider(repo);
      await screen.findByText('0 items');
      let result: WorkoutResult | null | undefined;
      await act(async () => {
        result = await session().finish();
      });
      expect(result).toBeNull();
      expect(session().finishError).toBe('Add at least one exercise before finishing!');
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('refuses to add an exercise while a save is in flight, then allows it again', async () => {
      const repo = createMemoryRepository(legacySave());
      const saving = pendingSave(repo);
      const { session } = renderProvider(repo);
      await screen.findByText('0 items');
      act(() => {
        session().addEntry(bench);
      });

      let pending: Promise<WorkoutResult | null> | undefined;
      act(() => {
        pending = session().finish();
      });
      expect(await screen.findByText('1 items, finishing')).toBeInTheDocument();

      expect(() => session().addEntry(swim)).toThrow('Cannot add an exercise while the workout is being saved');
      expect(session().items.map((i) => i.entry)).toEqual([bench]);
      expect(readStored()?.items.map((i) => i.entry)).toEqual([bench]);

      await act(async () => {
        saving().resolve();
        await pending;
      });
      expect(session().items).toEqual([]);
      // Only the logged entry reached the save.
      expect(repo.save.mock.calls[0]?.[0].workoutLog[0]?.exercises).toEqual([bench]);

      act(() => {
        session().addEntry(swim);
      });
      expect(session().items.map((i) => i.entry)).toEqual([swim]);
    });

    it('removes by id during a pending save: the other logged item stays, and storage matches', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const repo = createMemoryRepository(legacySave());
      const saving = pendingSave(repo);
      const { session } = renderProvider(repo);
      await screen.findByText('0 items');
      // Identical entries: only the id tells them apart.
      act(() => {
        session().addEntry(bench);
      });
      act(() => {
        session().addEntry(bench);
      });
      const [first, second] = session().items;

      let pending: Promise<WorkoutResult | null> | undefined;
      act(() => {
        pending = session().finish();
      });
      await screen.findByText('2 items, finishing');

      act(() => session().removeItem(first!.id));
      expect(session().items).toEqual([second]);
      expect(readStored()?.items).toEqual([second]);

      await act(async () => {
        saving().reject(new Error('quota exceeded'));
        await pending;
      });
      expect(session().items).toEqual([second]);
      expect(readStored()?.items).toEqual([second]);
      expect(session().finishError).toBe("Couldn't save your workout. Try again.");
    });

    it('removes the stored draft synchronously when finish() resolves, before effects flush', async () => {
      const repo = createMemoryRepository(legacySave());
      const { session } = renderProvider(repo);
      await screen.findByText('0 items');
      act(() => {
        session().addEntry(bench);
        session().addEntry(swim);
      });
      expect(readStored()?.items).toHaveLength(2);

      let storedAtResolve: string | null | undefined;
      let domAtResolve: string | null | undefined;
      await act(async () => {
        await session().finish();
        // Still inside act: React hasn't committed the post-save render or run the persist effect yet.
        storedAtResolve = sessionStorage.getItem(SESSION_KEY);
        domAtResolve = screen.queryByText(/items/)?.textContent ?? null;
      });
      // Nothing from finish() has been committed yet (act batches it all), so no persist effect has run...
      expect(domAtResolve).toBe('2 items');
      // ...yet the draft is already gone: a reload now can't restore (and re-log) the saved workout.
      expect(storedAtResolve).toBeNull();
      expect(screen.getByText('0 items')).toBeInTheDocument();
    });

    it('keeps the items and sets the error when the save fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const repo = createMemoryRepository(legacySave());
      repo.save.mockRejectedValueOnce(new Error('quota exceeded'));
      const { session } = renderProvider(repo);
      await screen.findByText('0 items');
      act(() => {
        session().addEntry(bench);
        session().addEntry(swim);
      });
      const before = session().items;

      let result: WorkoutResult | null | undefined;
      await act(async () => {
        result = await session().finish();
      });
      expect(result).toBeNull();
      expect(session().items).toEqual(before);
      expect(session().finishing).toBe(false);
      expect(session().finishError).toBe("Couldn't save your workout. Try again.");
      expect(readStored()?.items).toEqual(before);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('a concurrent finish() returns null and saves once', async () => {
      const repo = createMemoryRepository(legacySave());
      const saving = pendingSave(repo);
      const { session } = renderProvider(repo);
      await screen.findByText('0 items');
      act(() => {
        session().addEntry(bench);
      });

      let first: Promise<WorkoutResult | null> | undefined;
      let second: WorkoutResult | null | undefined;
      await act(async () => {
        first = session().finish();
        second = await session().finish();
      });
      expect(second).toBeNull();
      // The second call doesn't clobber the first call's state.
      expect(session().finishing).toBe(true);
      expect(session().finishError).toBeNull();

      await act(async () => {
        saving().resolve();
        await first;
      });
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(session().items).toEqual([]);
    });

    it('clears a previous error when an entry is added or a retry starts', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const repo = createMemoryRepository(legacySave());
      const { session } = renderProvider(repo);
      await screen.findByText('0 items');
      await act(async () => {
        await session().finish();
      });
      expect(session().finishError).not.toBeNull();
      act(() => {
        session().addEntry(bench);
      });
      expect(session().finishError).toBeNull();

      repo.save.mockRejectedValueOnce(new Error('nope'));
      await act(async () => {
        await session().finish();
      });
      expect(session().finishError).toBe("Couldn't save your workout. Try again.");
      const saving = pendingSave(repo);
      let retry: Promise<WorkoutResult | null> | undefined;
      act(() => {
        retry = session().finish();
      });
      expect(session().finishError).toBeNull();
      await act(async () => {
        saving().resolve();
        await retry;
      });
    });

    it('never puts ids into the saved workoutLog, and the saved data validates', async () => {
      const repo = createMemoryRepository(legacySave());
      const { session } = renderProvider(repo);
      await screen.findByText('0 items');
      act(() => {
        session().addEntry(bench);
        session().addEntry(swim);
      });
      await act(async () => {
        await session().finish();
      });
      const saved = repo.save.mock.calls[0]?.[0];
      expect(saved).toBeDefined();
      const exercises = saved!.workoutLog[0]!.exercises;
      expect(exercises).toEqual([bench, swim]);
      for (const exercise of exercises) {
        expect(Object.keys(exercise).sort()).toEqual(['data', 'icon', 'name', 'stat', 'timestamp', 'xpGained']);
      }
      expect(JSON.stringify(saved)).not.toContain('"entry"');
      expect(SaveDataSchema.safeParse(saved).success).toBe(true);
      // The untouched legacy entry is still there, still valid.
      expect(saved!.workoutLog[1]).toEqual(legacySave().workoutLog[0]);
    });

    it('shows the level-up dialog when the save levels something up, and Continue closes it', async () => {
      const repo = createMemoryRepository(legacySave());
      const { session } = renderProvider(repo);
      await screen.findByText('0 items');
      act(() => {
        session().addEntry(bench); // 30 → 60 XP: level 2 → 4
        session().addEntry(swim); // 0 → 20 XP: level 1 → 2
      });
      await act(async () => {
        await session().finish();
      });
      const dialog = screen.getByRole('dialog', { name: '⚔️ LEVEL UP! ⚔️' });
      const items = within(dialog).getAllByRole('listitem');
      expect(items.map((li) => li.textContent)).toEqual([
        // Icons come from the stat definitions, not the entry.
        '🏋️Bench Press2 → 4level 2 to level 4',
        '🏊Swimming1 → 2level 1 to level 2',
      ]);
      await userEvent.setup().click(within(dialog).getByRole('button', { name: 'Continue' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('after Finish on the real Hub, closing the dialog with Escape focuses the Hub h1', async () => {
    const user = renderWorkout(createMemoryRepository(legacySave()), '/workout', { hub: <HubScreen /> });
    await logExercise(user, 'Bench Press', { '^sets': '3', '^reps': '10' });
    await user.click(screen.getByRole('button', { name: /finish workout/i }));

    const dialog = await screen.findByRole('dialog', { name: '⚔️ LEVEL UP! ⚔️' });
    const heading = screen.getByRole('heading', { level: 1, name: 'Aragorn' });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Continue' })).toHaveFocus());

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(heading).toHaveFocus());
    expect(heading).toHaveAttribute('tabindex', '-1');
  });
});
