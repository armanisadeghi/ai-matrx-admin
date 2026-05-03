/**
 * Builds the `ApplicationScope` payload sent to per-column agents via
 * `useShortcutTrigger` / `launchAgentExecution`. The keys here correspond
 * to the variables defined on each agent's record:
 *
 *   - cleaning agent: `prior_cleaned_suffix`, `raw_window`, `session_title`,
 *     `module_id`
 *   - concept agent (Phase 6): `raw_window`, `prior_concepts`, `session_title`
 *   - module agents (Phase 7): module-defined; the registry's `buildScope`
 *     contributes additional keys.
 *
 * Centralising this here keeps the contract in one place — when a new
 * variable lands on an agent we add a builder here, not inside the thunk.
 */

import {
  CLEANING_CONTEXT_CHAR_BUDGET,
  RESUME_MARKER,
} from "../constants";
import type {
  CleanedSegment,
  RawSegment,
  StudioSession,
} from "../types";

export interface CleaningWindowInputs {
  rawSegments: RawSegment[];
  /** Active (non-superseded) cleaned segments, ordered by tStart. */
  cleanedSegments: CleanedSegment[];
  session: StudioSession;
}

export interface CleaningWindow {
  /** Slice of raw segments not yet covered by an active cleaned segment. */
  windowSegments: RawSegment[];
  /** Concatenated text of `windowSegments`. Empty when nothing new to clean. */
  rawWindow: string;
  /** Last ~1000 chars of prior cleaned text, ending with `[[RESUME]]`. */
  priorCleanedSuffix: string;
  /** tStart of the first segment in `windowSegments`, or null when empty. */
  replaceFromTime: number | null;
  /** tEnd of the last segment in `windowSegments`, or null when empty. */
  replaceToTime: number | null;
  /** Char-range of the new raw text within the full session raw text. */
  inputCharRange: [number, number] | null;
  /** ApplicationScope payload to pass to useShortcutTrigger's `scope`. */
  scope: {
    prior_cleaned_suffix: string;
    raw_window: string;
    session_title: string;
    module_id: string;
  };
}

/**
 * Compute the next cleanup window from the current raw + cleaned state.
 *
 * `replaceFromTime` is the tStart of the first uncleaned raw segment.
 * Anything cleaned at or after that time will be superseded by the new
 * segment when the agent's response is applied.
 */
export function buildCleaningWindow({
  rawSegments,
  cleanedSegments,
  session,
}: CleaningWindowInputs): CleaningWindow {
  // The boundary: tEnd of the last active cleaned segment. Raw text strictly
  // after that boundary is the new window.
  const lastCleaned = cleanedSegments[cleanedSegments.length - 1];
  const boundary = lastCleaned?.tEnd ?? 0;

  const windowSegments: RawSegment[] = [];
  for (const seg of rawSegments) {
    if (seg.tStart >= boundary) windowSegments.push(seg);
  }

  const rawWindow = windowSegments.map((s) => s.text).join("\n");
  const replaceFromTime = windowSegments[0]?.tStart ?? null;
  const replaceToTime =
    windowSegments[windowSegments.length - 1]?.tEnd ?? null;

  // Char range of the window within the full session raw text. Useful for
  // audit / debugging; persisted on the run row.
  let charOffset = 0;
  for (const seg of rawSegments) {
    if (seg === windowSegments[0]) break;
    charOffset += seg.text.length + 1; // +1 for the joiner
  }
  const inputCharRange: [number, number] | null = rawWindow
    ? [charOffset, charOffset + rawWindow.length]
    : null;

  // Suffix of the active cleaned text, capped to CLEANING_CONTEXT_CHAR_BUDGET.
  // Always ends with the resume marker so the agent has a clear anchor.
  const priorCleanedSuffix = buildPriorCleanedSuffix(cleanedSegments);

  return {
    windowSegments,
    rawWindow,
    priorCleanedSuffix,
    replaceFromTime,
    replaceToTime,
    inputCharRange,
    scope: {
      prior_cleaned_suffix: priorCleanedSuffix,
      raw_window: rawWindow,
      session_title: session.title ?? "",
      module_id: session.moduleId ?? "",
    },
  };
}

function buildPriorCleanedSuffix(cleaned: CleanedSegment[]): string {
  if (cleaned.length === 0) return "";
  // Walk backwards accumulating up to the budget.
  const parts: string[] = [];
  let total = 0;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    const text = cleaned[i]!.text;
    if (total + text.length + 1 > CLEANING_CONTEXT_CHAR_BUDGET) {
      // Last fragment — clip from the LEFT so we keep the most recent text.
      const remaining = CLEANING_CONTEXT_CHAR_BUDGET - total;
      if (remaining > 80) {
        parts.unshift("…" + text.slice(-(remaining - 1)));
      }
      break;
    }
    parts.unshift(text);
    total += text.length + 1;
  }
  return `${parts.join("\n")}\n${RESUME_MARKER}`;
}

/**
 * Strip the leading `[[RESUME]]` marker from an agent response. Tolerant of
 * whitespace and an optional newline. If the marker is missing entirely we
 * log a warning and treat the whole response as cleaned text — the run
 * still succeeds because partial output is more useful than a hard fail.
 *
 * If the response is empty after stripping, returns `null` so the caller
 * can mark the run failed without inserting an empty cleaned segment.
 */
export function stripResumeMarker(response: string): string | null {
  const trimmed = response.trim();
  // Take text after the LAST occurrence — agents sometimes echo prior
  // context that ends with the marker, then insert the marker again.
  const idx = trimmed.lastIndexOf(RESUME_MARKER);
  let body = idx >= 0 ? trimmed.slice(idx + RESUME_MARKER.length) : trimmed;
  body = body.replace(/^\s*\n?/, "").trim();
  if (!body) return null;
  return body;
}
