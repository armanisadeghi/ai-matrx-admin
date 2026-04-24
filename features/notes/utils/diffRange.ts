// features/notes/utils/diffRange.ts
// Single-region diff: given old and new strings, find the span in `newStr`
// where they differ. Used to flash-highlight the area that just changed
// after an undo / redo / realtime update.
//
// Algorithm: longest common prefix + longest common suffix, capped so the
// two never overlap. Returns the changed slice in `newStr` plus the
// equivalent slice in `oldStr` (so callers can tell insertion vs. deletion
// vs. replacement). Returns null when the strings are identical.

export interface DiffRange {
  /** Inclusive start offset in newStr where the change begins. */
  start: number;
  /** Exclusive end offset in newStr where the change ends.
   *  start === end means the change was a pure deletion. */
  end: number;
  /** Equivalent end offset in oldStr (start is the same). */
  oldEnd: number;
}

export function getDiffRange(oldStr: string, newStr: string): DiffRange | null {
  if (oldStr === newStr) return null;

  const oldLen = oldStr.length;
  const newLen = newStr.length;

  // Longest common prefix.
  let p = 0;
  const maxP = Math.min(oldLen, newLen);
  while (p < maxP && oldStr.charCodeAt(p) === newStr.charCodeAt(p)) p++;

  // Longest common suffix, capped so prefix + suffix never overlap on
  // either side.
  let s = 0;
  const maxS = Math.min(oldLen - p, newLen - p);
  while (
    s < maxS &&
    oldStr.charCodeAt(oldLen - 1 - s) === newStr.charCodeAt(newLen - 1 - s)
  ) {
    s++;
  }

  return {
    start: p,
    end: newLen - s,
    oldEnd: oldLen - s,
  };
}
