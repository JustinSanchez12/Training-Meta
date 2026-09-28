import { z } from 'zod';
import { ExerciseEntrySchema } from '@/lib/game/schema';

/** Highest XP one form can produce (100 sets × 1000 reps); anything above came from a tampered or corrupt draft. */
export const MAX_ENTRY_XP = 100_000;

/** A session entry plus a session-local id (for keys and removal). The id never reaches the saved workout log. */
export const SessionItemSchema = z.object({
  id: z.string().min(1),
  // A restored draft is untrusted input that feeds straight into the save, so XP is bounded here.
  entry: ExerciseEntrySchema.extend({ xpGained: z.number().nonnegative().max(MAX_ENTRY_XP) }),
});

/** The in-progress session as persisted in sessionStorage. `owner` is the character's createdAt. */
export const StoredSessionSchema = z.object({
  version: z.literal(1),
  owner: z.string(),
  items: z.array(SessionItemSchema),
});

export type SessionItem = z.infer<typeof SessionItemSchema>;
