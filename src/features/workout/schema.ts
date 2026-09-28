import { z } from 'zod';
import { ExerciseEntrySchema } from '@/lib/game/schema';

/** A session entry plus a session-local id (for keys and removal). The id never reaches the saved workout log. */
export const SessionItemSchema = z.object({
  id: z.string().min(1),
  entry: ExerciseEntrySchema,
});

/** The in-progress session as persisted in sessionStorage. `owner` is the character's createdAt. */
export const StoredSessionSchema = z.object({
  version: z.literal(1),
  owner: z.string(),
  items: z.array(SessionItemSchema).max(100),
});

export type SessionItem = z.infer<typeof SessionItemSchema>;
