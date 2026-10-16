// lib/sharedReads.ts — lane SHELL-DEDUPE
//
// ONE READ PER (PERSON, QUESTION), SHARED WHILE IT FLIES AND FOR A SHORT WHILE AFTER.
//
// The shell boots many surfaces a moment apart, and each used to ask the database its own copy of
// the same question (the inbox, the member's conversations, the account row). This is the one
// generic home of the pattern `features/organizations/service/memberOrganizationRows.ts` proved:
// callers that ask the same question for the same person share ONE promise. A read that failed is
// never shared past its flight; a write that changes the answer calls `forget`.

import { drainBootSeeds } from "@/lib/boot/bootSeedSlot";

export interface SharedReads {
  /** The answer to (person, key): the held read when one is in flight or fresh, else `fetch()`. */
  read<T>(
    person: string | null | undefined,
    key: string,
    fetch: () => PromiseLike<T>,
    options?: { isFailure?: (answer: T) => boolean },
  ): Promise<T>;
  /** Forget what is held — one key, or every key when none is named (a write, a refresh). */
  forget(key?: string): void;
  /**
   * Hold an answer the SERVER already read for this page load (the (core) layout's boot seed), so
   * the boot's reads of (person, key) are answered without a request: every read within
   * `SEED_MAX_AGE_MS` of the page load (the boot's late-idle readers land seconds after it). `forget`
   * drops it like any held read, so every write and refresh path still asks the database.
   */
  prime<T>(person: string | null | undefined, key: string, answer: T): void;
}

/** A seeded boot answer serves the boot's reads for this long after the page load, then expires. */
export const SEED_MAX_AGE_MS = 60_000;

interface Held {
  at: number; // 0 while in flight
  read: Promise<unknown>;
  /** Set while a primed boot answer has not been read yet: when it was primed. */
  seededAt?: number;
}

/** `ttlMs`: how long a landed answer stays shared. Realtime / cadence refreshes ask `fetch` directly. */
export function createSharedReads(ttlMs: number): SharedReads {
  const held = new Map<string, Held>();
  const addr = (person: string, key: string) => `${person}\u0000${key}`;
  return {
    read(person, key, fetch, options) {
      // No person yet: nothing to key on, so nothing is shared (never one person's answer for another).
      if (!person) return Promise.resolve(fetch());
      drainBootSeeds(); // a streamed boot seed that has arrived answers first
      const id = addr(person, key);
      const hit = held.get(id);
      if (hit?.seededAt !== undefined) {
        if (Date.now() - hit.seededAt < SEED_MAX_AGE_MS) return hit.read as Promise<never>;
        held.delete(id);
      } else if (hit && (hit.at === 0 || Date.now() - hit.at < ttlMs)) return hit.read as Promise<never>;
      const entry: Held = { at: 0, read: Promise.resolve() };
      entry.read = Promise.resolve(fetch()).then(
        (answer) => {
          if (options?.isFailure?.(answer)) {
            if (held.get(id) === entry) held.delete(id);
          } else entry.at = Date.now();
          return answer;
        },
        (thrown: unknown) => {
          if (held.get(id) === entry) held.delete(id);
          throw thrown;
        },
      );
      held.set(id, entry);
      return entry.read as Promise<never>;
    },
    prime(person, key, answer) {
      if (!person) return;
      const id = addr(person, key);
      if (held.has(id)) return; // a read already flew or landed: it is at least as new
      held.set(id, { at: Date.now(), read: Promise.resolve(answer), seededAt: Date.now() });
    },
    forget(key) {
      if (key === undefined) held.clear();
      else for (const id of [...held.keys()]) if (id.endsWith(`\u0000${key}`)) held.delete(id);
    },
  };
}

/**
 * ONE server-read boot answer held for a module cache that is not a `SharedReads` (same contract as
 * `prime`): `take()` answers for `SEED_MAX_AGE_MS` after `put`, and `drop()` forgets it (a write, a
 * sign-out).
 */
export interface SeedHold<T> {
  put(answer: T): void;
  take(): T | undefined;
  drop(): void;
}

export function createSeedHold<T>(): SeedHold<T> {
  let held: { answer: T; seededAt: number } | null = null;
  return {
    put(answer) {
      held = { answer, seededAt: Date.now() };
    },
    take() {
      if (!held) return undefined;
      if (Date.now() - held.seededAt >= SEED_MAX_AGE_MS) {
        held = null;
        return undefined;
      }
      return held.answer;
    },
    drop() {
      held = null;
    },
  };
}
