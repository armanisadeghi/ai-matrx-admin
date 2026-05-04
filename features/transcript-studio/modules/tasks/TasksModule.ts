/**
 * Tasks module — Column 4's default. Extracts action items from the cleaned
 * transcript and renders them via the existing markdown-checklist
 * `BlockRenderer` `tasks` block.
 *
 * Agent contract:
 *   - Input scope: { cleaned_window, prior_tasks, session_title }
 *   - Output: a markdown checklist string (no fences, just the markdown).
 *     Optionally section-headed with `##`. The studio persists the markdown
 *     verbatim into `studio_module_segments.payload` and the renderer
 *     forwards it to `<TasksBlock content={payload} />`.
 *
 * One module segment per pass — the markdown payload accumulates the agent's
 * task list for the time range. Mid-session module switches preserve the
 * tasks rows tagged with module_id="tasks" but the active selector filters
 * them out unless the user toggles "show prior modules" in settings.
 */

import { ListChecks } from "lucide-react";
import {
  DEFAULT_TASKS_SHORTCUT_ID,
  MODULE_INTERVAL_DEFAULT_MS,
} from "../../constants";
import { registerModule } from "../registry";
import type {
  ModuleDefinition,
  ModuleScopeInputs,
  ModuleScopeResult,
  ParsedModuleSegment,
} from "../types";

const TASKS_DEFAULT_INTERVAL_MS = 60_000; // task extraction cadence

/**
 * Window strategy: prefer cleaned text since it's higher-signal than raw
 * filler-laden chunks. Fall back to raw if cleanup hasn't covered yet.
 * The boundary moves forward by the most recent successful module pass.
 */
function buildScope(inputs: ModuleScopeInputs): ModuleScopeResult {
  const {
    rawSegments,
    cleanedSegments,
    priorModuleSegments,
    lastModuleCoverageTEnd,
    session,
  } = inputs;

  // Window of new content since last successful pass.
  const windowSegments = rawSegments.filter(
    (s) => s.tStart >= lastModuleCoverageTEnd,
  );
  const windowStartTime = windowSegments[0]?.tStart ?? null;
  const windowEndTime =
    windowSegments[windowSegments.length - 1]?.tEnd ?? null;

  let cleanedWindow = "";
  if (windowStartTime !== null && windowEndTime !== null) {
    const overlapping = cleanedSegments.filter(
      (c) => c.tEnd > windowStartTime && c.tStart < windowEndTime,
    );
    if (overlapping.length > 0) {
      const parts: string[] = overlapping.map((c) => c.text);
      const lastCleanedEnd = overlapping[overlapping.length - 1]!.tEnd;
      const tail = windowSegments.filter((s) => s.tStart >= lastCleanedEnd);
      if (tail.length > 0) parts.push(tail.map((s) => s.text).join("\n"));
      cleanedWindow = parts.join("\n\n");
    } else {
      cleanedWindow = windowSegments.map((s) => s.text).join("\n");
    }
  }

  // Prior tasks summary — concatenate the last few module segment payloads
  // so the agent doesn't re-extract the same items. Cap to ~1500 chars so
  // we stay well under the model's input budget.
  const priorTasks = buildPriorTasksSummary(priorModuleSegments);

  const hasNewWindow = cleanedWindow.trim().length > 0;
  const charStart = 0; // simple — we don't strictly need the offset for this module
  const charEnd = cleanedWindow.length;

  return {
    scope: {
      cleaned_window: cleanedWindow,
      prior_tasks: priorTasks,
      session_title: session.title ?? "",
    },
    hasNewWindow,
    windowStartTime,
    windowEndTime,
    inputCharRange: hasNewWindow ? [charStart, charEnd] : null,
  };
}

function buildPriorTasksSummary(prior: ReturnType<() => never[]> | unknown[]): string {
  const items = (prior as { payload: unknown }[]).slice(-3);
  if (items.length === 0) return "";
  const parts: string[] = [];
  for (const it of items) {
    if (typeof it.payload === "string") parts.push(it.payload);
  }
  const joined = parts.join("\n\n");
  if (joined.length <= 1500) return joined;
  return "…" + joined.slice(-1499);
}

/**
 * The agent returns a markdown checklist. We accept it raw (no fences) but
 * also tolerate a fenced ``` or ```markdown block.
 */
function parseRun(
  responseText: string,
): ParsedModuleSegment[] | null {
  const trimmed = responseText.trim();
  if (!trimmed) return [];

  // Strip a code fence if the agent wrapped it.
  const fence = trimmed.match(/```(?:markdown)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1]!.trim() : trimmed;

  if (!body) return [];

  // Sanity check: the body should contain at least one checkbox marker.
  // Otherwise the agent returned prose / refused — surface that as zero
  // segments rather than persisting noise.
  const hasCheckbox = /\[[ x]\]/i.test(body);
  if (!hasCheckbox) return [];

  return [
    {
      payload: body,
      tStart: null,
      tEnd: null,
    },
  ];
}

const TasksModule: ModuleDefinition = {
  id: "tasks",
  label: "Action items",
  description:
    "Extracts action items from the cleaned transcript as a checklist.",
  icon: ListChecks,
  defaultShortcutId: DEFAULT_TASKS_SHORTCUT_ID,
  defaultIntervalMs: TASKS_DEFAULT_INTERVAL_MS || MODULE_INTERVAL_DEFAULT_MS,
  blockType: "tasks",
  buildScope,
  parseRun,
};

registerModule(TasksModule);

export default TasksModule;
