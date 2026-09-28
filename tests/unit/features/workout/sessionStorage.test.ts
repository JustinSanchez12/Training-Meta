import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionItem } from '@/features/workout/schema';
import { SESSION_KEY, getSessionStorage, loadSession, newItemId, saveSession } from '@/features/workout/sessionStorage';

const OWNER = '2025-01-01T12:00:00.000Z';

const items: SessionItem[] = [
  {
    id: 'a',
    entry: { stat: 'benchPress', name: 'Bench Press', icon: '🏋️', data: { sets: 3, reps: 10 }, xpGained: 30, timestamp: '2026-09-28T12:00:00.000Z' },
  },
  {
    id: 'b',
    entry: { stat: 'mileRun', name: 'Mile Run', icon: '🏃', data: { distance: 0.3 }, xpGained: 3, timestamp: '2026-09-28T12:00:00.000Z' },
  },
];

/** A Storage whose every method throws, like a browser with storage blocked. */
function throwingStorage(): Storage {
  const fail = () => {
    throw new DOMException('denied', 'SecurityError');
  };
  return {
    get length() {
      return fail();
    },
    clear: fail,
    getItem: fail,
    key: fail,
    removeItem: fail,
    setItem: fail,
  };
}

describe('workout sessionStorage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the documented key', () => {
    expect(SESSION_KEY).toBe('the-training-meta-workout-session');
  });

  it('round-trips a session for the same owner', () => {
    saveSession(sessionStorage, OWNER, items);
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null')).toEqual({ version: 1, owner: OWNER, items });
    expect(loadSession(sessionStorage, OWNER)).toEqual(items);
  });

  it('returns [] when nothing is stored', () => {
    expect(loadSession(sessionStorage, OWNER)).toEqual([]);
  });

  it('returns [] with no storage at all', () => {
    expect(loadSession(null, OWNER)).toEqual([]);
    expect(() => saveSession(null, OWNER, items)).not.toThrow();
  });

  it.each([
    ['bad JSON', '{"version": 1, "owner":'],
    ['a wrong version', JSON.stringify({ version: 2, owner: OWNER, items })],
    ['a missing id', JSON.stringify({ version: 1, owner: OWNER, items: [{ entry: items[0]?.entry }] })],
    ['an empty id', JSON.stringify({ version: 1, owner: OWNER, items: [{ id: '', entry: items[0]?.entry }] })],
    ['an unknown stat', JSON.stringify({ version: 1, owner: OWNER, items: [{ id: 'x', entry: { ...items[0]?.entry, stat: 'telekinesis' } }] })],
    ['a non-array items', JSON.stringify({ version: 1, owner: OWNER, items: {} })],
    ['more than 100 items', JSON.stringify({ version: 1, owner: OWNER, items: Array.from({ length: 101 }, (_, i) => ({ id: `i${i}`, entry: items[0]?.entry })) })],
    ['null', 'null'],
  ])('%s → [] and the key is removed', (_label, raw) => {
    sessionStorage.setItem(SESSION_KEY, raw);
    let result: SessionItem[] | undefined;
    expect(() => {
      result = loadSession(sessionStorage, OWNER);
    }).not.toThrow();
    expect(result).toEqual([]);
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('accepts exactly 100 items', () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ id: `i${i}`, entry: items[0]!.entry }));
    saveSession(sessionStorage, OWNER, many);
    expect(loadSession(sessionStorage, OWNER)).toHaveLength(100);
  });

  it('discards a draft that belongs to another character', () => {
    saveSession(sessionStorage, 'someone-else', items);
    expect(loadSession(sessionStorage, OWNER)).toEqual([]);
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('returns [] without throwing when storage throws', () => {
    const storage = throwingStorage();
    expect(loadSession(storage, OWNER)).toEqual([]);
  });

  it('returns [] without throwing when the value is corrupt and removing it also throws', () => {
    const storage = throwingStorage();
    storage.getItem = () => '{corrupt';
    const removeItem = vi.spyOn(storage, 'removeItem');
    expect(loadSession(storage, OWNER)).toEqual([]);
    expect(removeItem).toHaveBeenCalledWith(SESSION_KEY);
  });

  it('saveSession with an empty session removes the key', () => {
    saveSession(sessionStorage, OWNER, items);
    saveSession(sessionStorage, OWNER, []);
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('saveSession never throws, even when storage throws (e.g. quota exceeded)', () => {
    const storage = throwingStorage();
    expect(() => saveSession(storage, OWNER, items)).not.toThrow();
    expect(() => saveSession(storage, OWNER, [])).not.toThrow();
  });

  it('getSessionStorage returns null when accessing sessionStorage throws', () => {
    expect(getSessionStorage()).toBe(window.sessionStorage);
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(getSessionStorage()).toBeNull();
  });

  it('newItemId returns unique non-empty ids, with or without crypto.randomUUID', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newItemId()));
    expect(ids.size).toBe(50);

    vi.stubGlobal('crypto', {});
    try {
      const fallback = new Set(Array.from({ length: 50 }, () => newItemId()));
      expect(fallback.size).toBe(50);
      for (const id of fallback) expect(id.length).toBeGreaterThan(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
