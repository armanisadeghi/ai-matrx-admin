/**
 * Shared scope-builder used by every Column-4 module.
 *
 * Builds:
 *   - `cleaned_window` — text since the last successful pass, preferring
 *     cleaned segments where they overlap and falling back to raw text
 *     for the tail not yet covered by cleanup.
 *   - `prior_summary` — concatenation of the last `historyDepth` module
 *     payloads (string-coerced) capped at `priorCharBudget` so we don't
 *     blow the model's input budget when sessions get long.
 *
 * Modules just call this in their `buildScope` and assemble the final
 * `ApplicationScope` object using whatever variable names their agent
 * shortcut expects.
 */

import type { ModuleScopeInputs, ModuleScopeResult } from "../types";

interface BuildScopeOptions {
  /** Map the inputs into the agent-facing variable bag. */
  toScope(args: {
    cleanedWindow: string;
    priorSummary: string;
    sessionTitle: string;
  }): ModuleScopeResult["scope"];
  /** Max characters retained from the prior_summary tail. Default 1500. */
  priorCharBudget?: number;
  /** How many prior module segments to concatenate. Default 3. */
  historyDepth?: number;
}

export function buildModuleScopeFromInputs(
  inputs: ModuleScopeInputs,
  opts: BuildScopeOptions,
): ModuleScopeResult {
  const {
    rawSegments,
    cleanedSegments,
    priorModuleSegments,
    lastModuleCoverageTEnd,
    session,
  } = inputs;
  const priorCharBudget = opts.priorCharBudget ?? 1500;
  const historyDepth = opts.historyDepth ?? 3;

  // Window of new raw content since the last successful pass for this module.
  const windowSegments = rawSegments.filter(
    (s) => s.tStart >= lastModuleCoverageTEnd,
  );
  const windowStartTime = windowSegments[0]?.tStart ?? null;
  const windowEndTime = windowSegments[windowSegments.length - 1]?.tEnd ?? null;

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

  const priorSummary = buildPriorSummary(
    priorModuleSegments,
    historyDepth,
    priorCharBudget,
  );

  const hasNewWindow = cleanedWindow.trim().length > 0;
  return {
    scope: opts.toScope({
      cleanedWindow,
      priorSummary,
      sessionTitle: session.title ?? "",
    }),
    hasNewWindow,
    windowStartTime,
    windowEndTime,
    inputCharRange: hasNewWindow ? [0, cleanedWindow.length] : null,
  };
}

function buildPriorSummary(
  prior: ModuleScopeInputs["priorModuleSegments"],
  historyDepth: number,
  charBudget: number,
): string {
  const items = prior.slice(-historyDepth);
  if (items.length === 0) return "";
  const parts: string[] = [];
  for (const it of items) {
    const payload = it.payload;
    if (typeof payload === "string") parts.push(payload);
  }
  const joined = parts.join("\n\n");
  if (joined.length <= charBudget) return joined;
  return "…" + joined.slice(-(charBudget - 1));
}
