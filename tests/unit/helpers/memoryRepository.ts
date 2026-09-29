import { vi } from 'vitest';
import type { SaveData } from '@/lib/game/schema';
import type { SaveRepository } from '@/lib/storage';

/** In-memory SaveRepository with vi.fn spies, for rendering the app without localStorage. */
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
