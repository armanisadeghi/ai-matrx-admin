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
  const [polling, setPolling] = useState(false);
  const startedAt = useRef<number>(0);

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
    void read();
  }, [read]);

  // A machine already coming up (another tab, an agent) is followed too.
  useEffect(() => {
    if (machine && isWaking(machine) && !polling) {
      startedAt.current = Date.now();
      setPolling(true);
    }
  }, [machine, polling]);

  useEffect(() => {
    if (!polling) return;
    let disposed = false;
    const timer = window.setInterval(async () => {
      if (disposed || document.hidden) return;
      const next = await read();
      if (disposed || !next) return;
      if (next.ready || next.status === "failed" || next.status === "expired") {
        setPolling(false);
      } else if (Date.now() - startedAt.current > 5 * 60_000 /* past 5 min a wake is a failure with a button */) {
        setPolling(false);
        setError("The computer did not finish waking up.");
      }
    }, 2000 /* ask again every 2 s while it wakes */);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [polling, read]);

  const wake = useCallback(async () => {
    setError(null);
    startedAt.current = Date.now();
    setPolling(true);
    try {
      setMachine(await wakeCloudComputer());
    } catch (e) {
      setPolling(false);
      setError(plainError(e));
    }
  }, []);

  return { machine, error, waking: polling, wake, retry: read };
}
