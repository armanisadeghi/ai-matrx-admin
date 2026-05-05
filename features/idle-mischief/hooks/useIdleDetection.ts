// features/idle-mischief/hooks/useIdleDetection.ts
//
// Subscribes to user-activity events and exposes:
//   - idleSeconds:   how long since the last activity event (ticks every 250ms)
//   - bumpActivity:  call to manually mark "user is here" (e.g., on snap-back)
//
// Visibility: when the tab hides, idle accrual pauses; when it returns,
// accrual resumes (does not reset). This avoids "I came back from another
// tab and the room is full of mischief" surprise.

"use client";

import { useEffect, useRef, useState } from "react";
import { ACTIVITY_THROTTLE_MS } from "../constants";
import { throttle } from "../utils/throttle";

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
];

export interface IdleDetectionApi {
  idleSeconds: number;
  bumpActivity: () => void;
}

export function useIdleDetection(): IdleDetectionApi {
  const [idleSeconds, setIdleSeconds] = useState(0);
  const lastActivityRef = useRef<number>(Date.now());
  const accumulatedRef = useRef<number>(0);
  const lastTickRef = useRef<number>(Date.now());
  const visibleRef = useRef<boolean>(true);

  const bumpActivity = useRef(() => {
    lastActivityRef.current = Date.now();
    accumulatedRef.current = 0;
    setIdleSeconds(0);
  }).current;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onActivity = throttle(() => {
      bumpActivity();
    }, ACTIVITY_THROTTLE_MS);

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, onActivity, { passive: true });
    }

    const onVisibility = () => {
      const visible = document.visibilityState === "visible";
      visibleRef.current = visible;
      if (visible) {
        // Resume accrual without resetting accumulated time.
        lastTickRef.current = Date.now();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const tick = setInterval(() => {
      if (!visibleRef.current) return;
      const now = Date.now();
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      accumulatedRef.current += dt;
      const seconds = Math.floor(accumulatedRef.current / 1000);
      setIdleSeconds((prev) => (prev !== seconds ? seconds : prev));
    }, 250);

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(tick);
    };
  }, [bumpActivity]);

  return { idleSeconds, bumpActivity };
}
