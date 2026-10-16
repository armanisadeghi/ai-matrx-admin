// lib/boot/bootSeedSlot.ts — the one hook between a STREAMED boot seed and the reads it answers.
//
// The (core) layout streams a late core seed and the knob snapshot as inline scripts
// (`BootSeedScript`), which run the moment their HTML chunk arrives — before hydration, before
// any boot read. The reads that a seed can answer call `drainBootSeeds()` first; the browser half
// (`coreBootSeed.ts`) registers what draining means. No imports: every read module can call it.

const drains: Array<() => void> = [];

export function registerBootSeedDrain(drain: () => void): void {
  drains.push(drain);
}

/** Install any streamed seed that has arrived. Cheap and idempotent; never throws. */
export function drainBootSeeds(): void {
  for (const drain of drains) {
    try {
      drain();
    } catch (err) {
      console.warn("[core-boot-seed] a streamed seed could not be installed; the read asks the database", err);
    }
  }
}

const forgets: Array<() => void> = [];

/** A module holding an unread seed of its own registers how to drop it. */
export function registerBootSeedForget(forget: () => void): void {
  forgets.push(forget);
}

/** A write or refresh changed the answers: no seed that is still unread may outlive it. */
export function dropUnreadBootSeeds(): void {
  for (const forget of forgets) forget();
}

/** The window globals the streamed scripts write (`BootSeedScript`). */
export const STREAMED_CORE_SEED_GLOBAL = "__matrxCoreBootSeed";
export const STREAMED_KNOB_SEED_GLOBAL = "__matrxKnobBootSeed";
