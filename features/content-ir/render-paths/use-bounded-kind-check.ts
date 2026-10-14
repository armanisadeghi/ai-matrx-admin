"use client";

/**
 * THE PREVIEW'S CHECK IS BOUNDED (2026-10-14). The verdict waits for the
 * kind's schema read and the component list to settle; a hung read used to
 * leave "Checking this shape…" on screen forever. The wait now ends at
 * {@link SHAPE_LOAD_DEADLINE_MS} in a named timeout — one honest line with
 * Try again, never "no schema". While timed out it keeps re-asking on
 * reconnect signals and a bounded backoff WITHOUT flipping back to
 * "Checking…"; only a settled answer (or a press of Try again) clears it.
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

function askAgain(kind: string): void {
  kindRegistry.retrySchema(kind);
  void componentRegistry.refresh(0);
}

export function useBoundedKindCheck(
  kind: string,
  settled: boolean,
  deadlineMs: number = SHAPE_LOAD_DEADLINE_MS,
): { timedOut: boolean; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  // The kind whose check timed out; cleared by a settle or a manual retry.
  const [timedOutKind, setTimedOutKind] = useState<string | null>(null);

  useEffect(() => {
    if (settled) return;
    let live = true;
    withLoadDeadline(whenKindCheckSettles(kind), `the "${kind}" shape check`, deadlineMs).catch(
      (error: unknown) => {
        if (live && isLoadTimeoutError(error)) setTimedOutKind(kind);
      },
    );
    return () => {
      live = false;
    };
  }, [kind, settled, deadlineMs, attempt]);

  const timedOut = !settled && timedOutKind === kind;
  // Automatic re-asks keep the honest line on screen; the wait re-arms.
  useReconnectRetry(timedOut, () => {
    askAgain(kind);
    setAttempt((n) => n + 1);
  });
  const retry = () => {
    askAgain(kind);
    setTimedOutKind(null);
    setAttempt((n) => n + 1);
  };
  return { timedOut, retry };
}
