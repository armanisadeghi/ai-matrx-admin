// features/idle-mischief/hooks/useIdleDetection.ts
//
// Tracks how long the user has been INACTIVE. The definition of "active" is
// deliberately broad — it covers everything that signals the user is engaged
// with the page, not just mouse motion:
//
//   Pointer:    pointermove, pointerdown, wheel
//   Touch:      touchstart, touchmove
//   Keyboard:   keydown
//   Form input: input        ← speech-to-text dictation, paste, programmatic
//   IME/dictation: compositionstart, compositionupdate, compositionend
//   Focus:      focusin       ← any element being focused
//   Selection:  selectionchange (on document)
//   Clipboard:  paste, cut, copy
//   Drag:       dragover, drop
//
// On top of these events, we also poll for a "user-is-busy" condition every
// idle tick:
//   - active text input/textarea/contenteditable focus → busy
//   - global recording state isRecording / isTranscribing → busy
//   - any non-empty selection → busy
//   - document hidden (tab in background) → busy (don't start mischief
//     while the user is on another tab)
//
// Whenever any event fires OR the busy probe returns true, the idle clock
// resets to 0.
//
// Visibility: when the tab hides, accrual pauses; when it returns, accrual
// resumes (does not reset).

"use client";

import { useEffect, useRef, useState } from "react";
import { ACTIVITY_THROTTLE_MS } from "../constants";
import { throttle } from "../utils/throttle";
import { isUserBusy } from "../utils/isUserBusy";
import { useAppStore } from "@/lib/redux/hooks";

/**
 * Window events that indicate user activity. Each one is sufficient to
 * reset the idle clock. All listeners are passive so they never block.
 */
const WINDOW_ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "pointermove",
  "pointerdown",
  "wheel",
  "touchstart",
  "touchmove",
  "keydown",
  "input",
  "compositionstart",
  "compositionupdate",
  "compositionend",
  "focusin",
  "paste",
  "cut",
  "copy",
  "dragover",
  "drop",
];

/**
 * Document events. `selectionchange` fires on the document, not window.
 */
const DOCUMENT_ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  "selectionchange",
];

export interface IdleDetectionApi {
  /** Whole seconds of inactivity since the last activity event / busy probe. */
  idleSeconds: number;
  /** Reset the idle clock to 0 (same as a real activity event). */
  bumpActivity: () => void;
}

export function useIdleDetection(): IdleDetectionApi {
  const store = useAppStore();
  const [idleSeconds, setIdleSeconds] = useState(0);
  const accumulatedRef = useRef<number>(0);
  const lastTickRef = useRef<number>(Date.now());
  const visibleRef = useRef<boolean>(true);

  const resetIdle = useRef(() => {
    accumulatedRef.current = 0;
    lastTickRef.current = Date.now();
    setIdleSeconds(0);
  }).current;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onActivity = throttle(() => {
      resetIdle();
    }, ACTIVITY_THROTTLE_MS);

    for (const evt of WINDOW_ACTIVITY_EVENTS) {
      window.addEventListener(evt, onActivity, { passive: true, capture: true });
    }
    for (const evt of DOCUMENT_ACTIVITY_EVENTS) {
      document.addEventListener(evt, onActivity, { passive: true, capture: true });
    }

    const onVisibility = () => {
      const visible = document.visibilityState === "visible";
      visibleRef.current = visible;
      if (visible) {
        // Resume accrual without resetting accumulated time.
        lastTickRef.current = Date.now();
      } else {
        // Tab hidden → treat as activity so we don't start an act for a
        // user who's actually on another tab.
        resetIdle();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Tick: every 250ms, accumulate elapsed time, BUT also probe the
    // busy state. If the user is busy (focused input, recording,
    // transcribing, selection, hidden tab), reset the idle clock.
    const tick = setInterval(() => {
      if (!visibleRef.current) return;
      if (isUserBusy(store.getState())) {
        resetIdle();
        return;
      }
      const now = Date.now();
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      accumulatedRef.current += dt;
      const seconds = Math.floor(accumulatedRef.current / 1000);
      setIdleSeconds((prev) => (prev !== seconds ? seconds : prev));
    }, 250);

    return () => {
      for (const evt of WINDOW_ACTIVITY_EVENTS) {
        window.removeEventListener(evt, onActivity, true);
      }
      for (const evt of DOCUMENT_ACTIVITY_EVENTS) {
        document.removeEventListener(evt, onActivity, true);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(tick);
    };
  }, [resetIdle, store]);

  return { idleSeconds, bumpActivity: resetIdle };
}
