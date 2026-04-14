"use client";

/**
 * ExecutionManager — null render guard used by agent widgets while the
 * pre-execution gate is active.
 *
 * The gate window itself is opened by the launch thunk (not here) to avoid
 * a chicken-and-egg problem: widgets only mount after their overlay is open,
 * so they cannot be responsible for opening the gate.
 *
 * This component simply renders nothing, keeping the widget's slot empty
 * until the user passes through the gate (at which point needsPreExecution
 * becomes false and the real widget content renders).
 */

export function ExecutionManager(_props: { conversationId: string }) {
  return null;
}
