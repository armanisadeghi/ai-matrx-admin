"use client";

/**
 * THE PREVIEW'S CHECK IS BOUNDED (2026-10-14). The verdict waits for the
 * kind's schema read and the component list to settle; a hung read used to
 * leave "Checking this shape…" on screen forever. The wait now ends at
 * {@link SHAPE_LOAD_DEADLINE_MS} in a named timeout — one honest line with
 * Try again, never "no schema" — and retries itself on reconnect signals.
 */

import { useEffect, useState } from "react";
import { kindRegistry } from "@/features/content-ir/registry/kind-registry";
import { componentRegistry } from "@/features/content-ir/registry/component-registry";
import {
  SHAPE_LOAD_DEADLINE_MS,
  isLoadTimeoutError,
  useReconnectRetry,
  withLoadDeadline,
} from "@/features/content-ir/studio/bounded-load";

/** Settles when the kind's schema read and the component list have both answered. */
export function whenKindCheckSettles(kind: string): Promise<unknown> {
  return Promise.all([
    kindRegistry.whenSchemaSettled(kind),
    componentRegistry.ensureWarm().catch(() => undefined),
  ]);
}

export function useBoundedKindCheck(
  kind: string,
  settled: boolean,
  deadlineMs: number = SHAPE_LOAD_DEADLINE_MS,
): { timedOut: boolean; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [timedOutAttempt, setTimedOutAttempt] = useState<string | null>(null);
  const attemptKey = `${kind}#${attempt}`;

  useEffect(() => {
    if (settled) return;
    let live = true;
    withLoadDeadline(whenKindCheckSettles(kind), `the "${kind}" shape check`, deadlineMs).catch(
      (error: unknown) => {
        if (live && isLoadTimeoutError(error)) setTimedOutAttempt(attemptKey);
      },
    );
    return () => {
      live = false;
    };
  }, [kind, settled, deadlineMs, attemptKey]);

  const timedOut = !settled && timedOutAttempt === attemptKey;
  const retry = () => {
    kindRegistry.retrySchema(kind);
    void componentRegistry.refresh(0);
    setAttempt((n) => n + 1);
  };
  useReconnectRetry(timedOut, retry);
  return { timedOut, retry };
}
