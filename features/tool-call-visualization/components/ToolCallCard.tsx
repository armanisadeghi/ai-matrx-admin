"use client";

/**
 * ToolCallCard
 *
 * The single, props-only tool-call renderer. Replaces the trio of
 * `LiveToolCallCard`, `InlineToolCard`, and `PersistedToolCallCard` that
 * each pulled their data from a different Redux slice. This component is
 * pure presentational: callers fetch joined data via the canonical selector
 * (`selectMessageInterleavedContent` for persisted turns, the segment is
 * already populated with arguments/result/isError) and pass it as props.
 *
 * No `useAppSelector`, no observability lookups, no callId→uuid resolution.
 * That all happens upstream in Redux. This component only knows how to
 * convert a flat set of fields into a `ToolLifecycleEntry` and hand it to
 * the canonical visualization shell.
 */

import { useMemo } from "react";
import type { ToolLifecycleEntry } from "@/features/agents/types/request.types";
import { ToolCallVisualization } from "./ToolCallVisualization";

export interface ToolCallCardProps {
  callId: string;
  toolName: string;
  /** Arguments captured from the cx_tool_call row (already joined upstream). */
  arguments: Record<string, unknown>;
  /**
   * Tool output. From `selectMessageInterleavedContent` this is
   * `outputPreview ?? output`. Strings are best-effort JSON-parsed so
   * downstream renderers see the same shape they get from the live path.
   */
  result: unknown;
  isError: boolean;
  /** Optional — primarily for floating-window grouping by request. */
  requestId?: string;
  className?: string;
}

export function ToolCallCard({
  callId,
  toolName,
  arguments: args,
  result,
  isError,
  requestId,
  className,
}: ToolCallCardProps) {
  const entry = useMemo<ToolLifecycleEntry>(() => {
    let parsedResult: unknown = result;
    if (typeof parsedResult === "string" && !isError) {
      try {
        parsedResult = JSON.parse(parsedResult);
      } catch {
        // Plain-text result — leave as-is.
      }
    }

    const now = new Date().toISOString();
    return {
      callId,
      toolName,
      status: isError ? "error" : "completed",
      arguments: args ?? {},
      startedAt: now,
      completedAt: now,
      latestMessage: null,
      latestData: null,
      result: isError ? null : parsedResult,
      resultPreview: null,
      errorType: null,
      errorMessage: isError
        ? typeof result === "string"
          ? result
          : result == null
            ? null
            : JSON.stringify(result)
        : null,
      isDelegated: false,
      events: [],
    };
  }, [callId, toolName, args, result, isError]);

  return (
    <ToolCallVisualization
      entries={[entry]}
      requestId={requestId}
      isPersisted
      hasContent={false}
      className={className}
    />
  );
}
