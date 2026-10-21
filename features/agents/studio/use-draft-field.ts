"use client";

/**
 * A field the person types into while something else (the save echo, the 2.5 s poll, the assistant's
 * `studio_workspace` writes) keeps replacing the record it reads from. The rule: the person's edits win.
 *
 *  - While the person has the field focused, has unsaved text, or a save is in flight, the field shows
 *    THEIR draft and ignores the incoming value (so a save echo of keystroke N never lands on top of
 *    keystroke N+3, and the caret never jumps).
 *  - Saves are debounced (one per pause, not one per key) and flushed on blur and on unmount.
 *  - Once the person has left the field and everything is saved, the field follows the record again.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export const DRAFT_SAVE_DELAY_MS = 400;

export function useDraftField(
  value: string,
  commit: (next: string) => void | Promise<void>,
  delayMs: number = DRAFT_SAVE_DELAY_MS,
) {
  const [draft, setDraft] = useState<string | null>(null);
  const latest = useRef<string | null>(null); // text not yet handed to commit
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(0);
  const focused = useRef(false);
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });

  const release = useCallback(() => {
    if (!focused.current && !timer.current && latest.current === null && inFlight.current === 0) setDraft(null);
  }, []);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (latest.current === null) {
      release();
      return;
    }
    const next = latest.current;
    latest.current = null;
    inFlight.current += 1;
    let pending: Promise<void>;
    try {
      pending = Promise.resolve(commitRef.current(next));
    } catch (e) {
      pending = Promise.reject(e);
    }
    void pending
      .catch((e: unknown) => {
        // The commit shows its own failure to the person; the draft stays so nothing typed is lost.
        console.warn("[studio] a field did not save; the draft is kept", e);
      })
      .finally(() => {
        inFlight.current -= 1;
        release();
      });
  }, [release]);

  useEffect(
    () => () => {
      // Leaving the screen mid-edit still saves what was typed.
      if (timer.current) clearTimeout(timer.current);
      if (latest.current !== null) void Promise.resolve(commitRef.current(latest.current));
    },
    [],
  );

  return {
    text: draft ?? value,
    onChange: (next: string) => {
      setDraft(next);
      latest.current = next;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delayMs);
    },
    onFocus: () => {
      focused.current = true;
    },
    onBlur: () => {
      focused.current = false;
      flush();
    },
  };
}
