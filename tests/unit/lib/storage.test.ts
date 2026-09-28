import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SAVE_KEY, createLocalSaveRepository } from '@/lib/storage';
import { legacySave } from '../fixtures/saves';

/** Minimal in-memory Storage so the repository can be tested without relying on jsdom globals. */
class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  clear() {
    this.items.clear();
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

describe('createLocalSaveRepository', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the legacy storage key', () => {
    expect(SAVE_KEY).toBe('ape-storage-the-training-meta');
  });

  it('returns null when nothing is saved', async () => {
    await expect(createLocalSaveRepository(storage).load()).resolves.toBeNull();
  });

  it('returns null for corrupt JSON and leaves it untouched', async () => {
    storage.setItem(SAVE_KEY, '{not json');
    await expect(createLocalSaveRepository(storage).load()).resolves.toBeNull();
    expect(storage.getItem(SAVE_KEY)).toBe('{not json');
  });

  it('returns null for JSON that fails validation', async () => {
    storage.setItem(SAVE_KEY, JSON.stringify({ player: null }));
    await expect(createLocalSaveRepository(storage).load()).resolves.toBeNull();
  });

  it('returns null for a save still flagged as a new player', async () => {
    const save = legacySave();
    save.player.isNewPlayer = true;
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    await expect(createLocalSaveRepository(storage).load()).resolves.toBeNull();
  });

  it('returns null when storage access throws', async () => {
    vi.spyOn(storage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    await expect(createLocalSaveRepository(storage).load()).resolves.toBeNull();
  });

  it('loads a legacy save written as raw JSON', async () => {
    storage.setItem(SAVE_KEY, JSON.stringify(legacySave()));
    const loaded = await createLocalSaveRepository(storage).load();
    expect(loaded).toEqual(legacySave());
    expect(loaded?.stats.mileRun.xp).toBe(3.0000000000000004);
    expect(loaded?.workoutLog[0]?.exercises).toHaveLength(2);
  });

  it('round-trips a valid save', async () => {
    const repo = createLocalSaveRepository(storage);
    await repo.save(legacySave());
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();
    await expect(repo.load()).resolves.toEqual(legacySave());
  });

  it('refuses to save invalid data', async () => {
    const repo = createLocalSaveRepository(storage);
    const bad = legacySave();
    bad.stats.squat = { level: 1, xp: -5 };
    await expect(repo.save(bad)).rejects.toThrow();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('clear removes the save', async () => {
    const repo = createLocalSaveRepository(storage);
    await repo.save(legacySave());
    await repo.clear();
    await expect(repo.load()).resolves.toBeNull();
  });

  it('respects a custom key', async () => {
    const repo = createLocalSaveRepository(storage, 'other-key');
    await repo.save(legacySave());
    expect(storage.getItem('other-key')).not.toBeNull();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it('defaults to window.localStorage', async () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(legacySave()));
    await expect(createLocalSaveRepository().load()).resolves.toEqual(legacySave());
  });

  it('loads a legacy save with an age above the character-form limit (legacy never capped age)', async () => {
    const save = legacySave();
    save.player.age = 150;
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    await expect(createLocalSaveRepository(storage).load()).resolves.toEqual(save);
  });

  it('backs up an unreadable save before overwriting it', async () => {
    storage.setItem(SAVE_KEY, '{not json');
    await createLocalSaveRepository(storage).save(legacySave());

    const backups = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k) => k?.startsWith(`${SAVE_KEY}-backup-`));
    expect(backups).toHaveLength(1);
    expect(storage.getItem(backups[0] ?? '')).toBe('{not json');
    expect(JSON.parse(storage.getItem(SAVE_KEY) ?? '')).toEqual(legacySave());
  });

  it('does not create a backup when overwriting a readable save', async () => {
    const repo = createLocalSaveRepository(storage);
    await repo.save(legacySave());
    await repo.save(legacySave());
    expect(storage.length).toBe(1);
  });
});
