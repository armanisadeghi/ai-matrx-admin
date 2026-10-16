"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BackendApiError } from "@ai-matrx/api";
import {
  getCloudComputer,
  isWaking,
  wakeCloudComputer,
  type CloudComputer,
} from "./service";

function plainError(e: unknown): string {
  if (e instanceof BackendApiError) return e.userMessage;
  return e instanceof Error && e.message ? e.message : "The computer could not be reached.";
}

/**
 * The person's Cloud Computer: one read on mount, a poll only while it is on
 * its way up (or the person pressed Wake), nothing while it sits still.
 */
export function useCloudComputer() {
  const [machine, setMachine] = useState<CloudComputer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pressed, setPressed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef(0);

  const read = useCallback(async () => {
    try {
      const next = await getCloudComputer();
      setMachine(next);
      setError(null);
      return next;
    } catch (e) {
      setError(plainError(e));
      return null;
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    void getCloudComputer().then(
      (next) => {
        if (!disposed) setMachine(next);
      },
      (e) => {
        if (!disposed) setError(plainError(e));
      },
    );
    return () => {
      disposed = true;
    };
  }, []);

  // Following a wake: the person pressed Wake, or the machine is already
  // coming up (another tab, an agent). Ends when it is ready, failed or late.
  const waking =
    !timedOut && (pressed || (machine !== null && isWaking(machine))) && !machine?.ready;

  useEffect(() => {
    if (!waking) return;
    if (!startedAt.current) startedAt.current = Date.now();
    let disposed = false;
    const timer = window.setInterval(async () => {
      if (disposed || document.hidden) return;
      const next = await read();
      if (disposed || !next) return;
      if (next.status === "failed" || next.status === "expired") {
        setPressed(false);
      } else if (!next.ready && Date.now() - startedAt.current > 5 * 60_000) {
        setPressed(false);
        setTimedOut(true);
        setError("The computer did not finish waking up.");
      }
    }, 2000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [waking, read]);

  const wake = useCallback(async () => {
    setError(null);
    setTimedOut(false);
    startedAt.current = Date.now();
    setPressed(true);
    try {
      setMachine(await wakeCloudComputer());
    } catch (e) {
      setPressed(false);
      setError(plainError(e));
    }
  }, []);

  return { machine, error, waking, wake, retry: read };
}
