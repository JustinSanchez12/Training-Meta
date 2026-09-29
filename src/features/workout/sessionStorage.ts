import { StoredSessionSchema, type SessionItem } from './schema';

export const SESSION_KEY = 'the-training-meta-workout-session';

/** sessionStorage, or null where it's unavailable (e.g. blocked by privacy settings). */
export function getSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function discard(storage: Storage, reason: string, detail?: unknown): SessionItem[] {
  console.warn(`[Workout] Discarding stored session: ${reason}`, detail ?? '');
  try {
    storage.removeItem(SESSION_KEY);
  } catch {
    // Storage is unusable; nothing more to do.
  }
  return [];
}

/** Restores this tab's in-progress session for `owner`. Anything unreadable or belonging to another character → []. */
export function loadSession(storage: Storage | null, owner: string): SessionItem[] {
  if (!storage) return [];

  let raw: string | null;
  try {
    raw = storage.getItem(SESSION_KEY);
  } catch (error) {
    console.warn('[Workout] sessionStorage unavailable', error);
    return [];
  }
  if (raw === null) return [];

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return discard(storage, 'not valid JSON');
  }

  const result = StoredSessionSchema.safeParse(json);
  if (!result.success) return discard(storage, 'failed validation', result.error.issues);
  if (result.data.owner !== owner) return discard(storage, 'belongs to a different character');
  return result.data.items;
}

/** Persists the session; never throws. An empty session removes the key. */
export function saveSession(storage: Storage | null, owner: string, items: readonly SessionItem[]): void {
  if (!storage) return;
  try {
    if (items.length === 0) storage.removeItem(SESSION_KEY);
    else storage.setItem(SESSION_KEY, JSON.stringify({ version: 1, owner, items }));
  } catch (error) {
    console.warn('[Workout] Could not persist the session', error);
  }
}

/** Removes the stored draft (e.g. after a character reset); never throws. */
export function clearSession(storage: Storage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(SESSION_KEY);
  } catch (error) {
    console.warn('[Workout] Could not clear the stored session', error);
  }
}

/** Session-local id. randomUUID needs a secure context (fine on localhost/HTTPS); fall back otherwise. */
export function newItemId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
