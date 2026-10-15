"use client";

/**
 * THE PREVIEW'S CHECK IS BOUNDED (2026-10-14). "Checking this shape…" ends at
 * {@link SHAPE_LOAD_DEADLINE_MS} in one honest line with Try again, never
 * "no schema". While timed out it keeps re-asking on reconnect signals and a
 * bounded backoff WITHOUT flipping back to "Checking…"; only a settled answer
 * (or a press of Try again) clears it.
 *
 * 🚨 THE BOUND WATCHES WHAT THE SCREEN SHOWS, NOT A PROXY (2026-10-14, live
 * /administration/utilities/kind-registry/brand_basics). The first version
 * timed out only when the REGISTRY promises (schema read + component list)
 * failed to settle. On a page whose sandbox frame never finished, both
 * promises settled, so no timeout ever fired — but the screen's own `settled`
 * never turned true, and "Checking this shape…" sat there for minutes. Now the
 * deadline is a plain timer on the caller's `settled` flag: whatever keeps the
 * screen unsettled, the strip ends in words by the deadline.
 *
 * {@link useKindCheckAnswers} is the other half: it counts registry settles so
 * the caller re-reads the registries when they answer (a memoised read keyed
 * only on a version that did not move would otherwise stay "pending").
 */

import { useEffect, useState } from "react";
import { kindRegistry } from "@/features/content-ir/registry/kind-registry";
import { componentRegistry } from "@/features/content-ir/registry/component-registry";
import {
  SHAPE_LOAD_DEADLINE_MS,
  useReconnectRetry,
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

/**
 * A counter that moves each time the kind's registry reads answer (first load,
 * a retry, a reconnect re-ask). Feed it into the version the screen reads the
 * registries with, so an answer always reaches the render.
 */
export function useKindCheckAnswers(kind: string, attempt = 0): number {
  const [answers, setAnswers] = useState(0);
  useEffect(() => {
    let live = true;
    whenKindCheckSettles(kind).then(
      () => {
        if (live) setAnswers((n) => n + 1);
      },
      () => {
        if (live) setAnswers((n) => n + 1);
      },
    );
    return () => {
      live = false;
    };
  }, [kind, attempt]);
  return answers;
}

export function useBoundedKindCheck(
  kind: string,
  settled: boolean,
  deadlineMs: number = SHAPE_LOAD_DEADLINE_MS,
): { timedOut: boolean; retry: () => void; attempt: number } {
  const [attempt, setAttempt] = useState(0);
  // The kind whose check timed out; cleared by a settle or a manual retry.
  const [timedOutKind, setTimedOutKind] = useState<string | null>(null);

  useEffect(() => {
    if (settled) return;
    const timer = setTimeout(() => setTimedOutKind(kind), deadlineMs);
    return () => clearTimeout(timer);
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
  return { timedOut, retry, attempt };
}
