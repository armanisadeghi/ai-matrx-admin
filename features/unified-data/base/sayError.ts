// features/unified-data/base/sayError.ts — the one sentence a base or table screen shows for a failed call.
// A statement timeout (SQLSTATE 57014, or Postgres' own "canceling statement due to statement timeout") reads as the
// store's timed-out sentence, never the database's words; anything else is the error's own sentence (AT-REVIEWFIX T).
import { TIMED_OUT_SENTENCE, errorSentenceOf, isTimedOutError } from "@ai-matrx/design-system";

export function sayError(error: unknown, fallback: string): string {
  if (isTimedOutError(error)) return TIMED_OUT_SENTENCE;
  return errorSentenceOf(error).trim() || fallback;
}
