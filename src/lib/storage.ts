import { SaveDataSchema, type SaveData } from './game/schema';

/** Same key as the legacy app, so existing saves on the same origin keep working. */
export const SAVE_KEY = 'ape-storage-the-training-meta';

/** Where an existing save that fails to load is copied before a new save overwrites it. */
export function backupKey(key: string, now: Date = new Date()): string {
  return `${key}-backup-${now.getTime()}`;
}

/** Never silently destroy player data we couldn't read: keep a copy for manual recovery. */
function backUpUnreadableSave(storage: Storage, key: string): void {
  const existing = storage.getItem(key);
  if (existing === null) return;
  let readable: boolean;
  try {
    const parsed = SaveDataSchema.safeParse(JSON.parse(existing));
    readable = parsed.success && !parsed.data.player.isNewPlayer;
  } catch {
    readable = false;
  }
  if (!readable) {
    const backup = backupKey(key);
    storage.setItem(backup, existing);
    console.warn(`[Storage] Existing save could not be read; backed up to "${backup}" before overwriting`);
  }
}

/** Async on purpose: a Supabase-backed implementation will replace the localStorage one. */
export interface SaveRepository {
  load(): Promise<SaveData | null>;
  save(data: SaveData): Promise<void>;
  clear(): Promise<void>;
}

/**
 * localStorage-backed saves. Missing, unparseable or schema-invalid data loads as `null`
 * (treated as "no character yet") and is left untouched until a new character is saved.
 */
export function createLocalSaveRepository(storage: Storage = window.localStorage, key: string = SAVE_KEY): SaveRepository {
  return {
    async load() {
      let raw: string | null;
      try {
        raw = storage.getItem(key);
      } catch (error) {
        console.warn('[Storage] localStorage unavailable', error);
        return null;
      }
      if (raw === null) return null;

      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        console.warn('[Storage] Save is not valid JSON; ignoring it');
        return null;
      }

      const result = SaveDataSchema.safeParse(json);
      if (!result.success) {
        console.warn('[Storage] Save failed validation; ignoring it', result.error.issues);
        return null;
      }
      return result.data.player.isNewPlayer ? null : result.data;
    },

    async save(data) {
      const next = JSON.stringify(SaveDataSchema.parse(data));
      backUpUnreadableSave(storage, key);
      storage.setItem(key, next);
    },

    async clear() {
      storage.removeItem(key);
    },
  };
}
