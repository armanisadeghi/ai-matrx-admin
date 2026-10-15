"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { WriteRefusedError } from "@/lib/errors/writeFailure";

/** A save the server refused or failed: its words for a person, and its request id when it gave one. */
export interface SaveFailure {
  message: string;
  requestId: string | null;
}

/** The server's own sentence (aidream's `user_message`) and request id from a failed save. Pure. */
export function saveFailureFrom(err: unknown): SaveFailure {
  const requestId = (err as { requestId?: unknown } | null)?.requestId;
  const message =
    err instanceof WriteRefusedError
      ? err.serverMessage || "The server could not save this schedule."
      : err instanceof Error && err.message
        ? err.message
        : "The schedule could not be saved.";
  return { message, requestId: typeof requestId === "string" && requestId ? requestId : null };
}

/**
 * The line above Save. A server failure says what the server said (and its request id); only a
 * field the form itself marked says "fix the highlighted fields" — never both, never that sentence
 * over a failure no field caused.
 */
export function SaveProblem({ failure, fieldErrors }: { failure: SaveFailure | null; fieldErrors: Record<string, string> }) {
  if (failure) {
    return (
      <Alert variant="destructive" data-testid="schedule-save-failure">
        <AlertDescription>
          {failure.message}
          {failure.requestId && (
            // ui-exception: a request id is an identifier to quote, not prose
            <span className="mt-1 block font-mono text-xs opacity-80">Request {failure.requestId}</span>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  if (Object.keys(fieldErrors).length === 0) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>Please fix the highlighted fields above before saving.</AlertDescription>
    </Alert>
  );
}
