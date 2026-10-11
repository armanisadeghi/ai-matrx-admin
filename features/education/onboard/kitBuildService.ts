// features/education/onboard/kitBuildService.ts
//
// 🚨 A KIT'S OUTPUTS ARE MADE AND SAVED BY THE SERVER (2026-10-11).
//
// The tab used to build them (`convertMany`): the agent calls ran on the
// server, but the merge of every section and the SAVE of the deck, quiz,
// notes and audio happened here — so a locked phone or a closed tab lost or
// orphaned them. Now the tab starts ONE server run, the system workflow
// `education_kit_build` (aidream `workflows/education_kit_build_v1.py`), and
// only watches it: one step per output, each of which reads the kit's
// Sources, runs the live mandate section by section, merges, saves the rows
// and links them into the kit — inside the run, with no page open.
//
// - start: `startKitBuild` (subject `kit:<id>`). The server answers an ACTIVE
//   build of the same kit with that run, so a reload, a second tab or a double
//   press rejoins instead of paying twice. `buildId` is the build's identity:
//   a fresh run of the same build (the first one ended or died) ADOPTS every
//   output already saved and makes only the rest.
// - lookup: `lookupKitBuildRun` — any page, on any device, finds the kit's
//   build and attaches to it.
// - watch: `kitTargetsFromRun` turns the run's per-step state (node id = the
//   output kind) into the kit board's rows.

import type { AppDispatch } from "@/lib/redux/store";
import type { WorkflowRunState } from "@/features/workflow-runtime/redux/workflow-runs.slice";
import type { SourceSet } from "@ai-matrx/agents/sources";
import type {
  ConvertOptions,
  TargetKind,
} from "@/features/education/convert/types";
import { kitOutlineSubject } from "@/features/education/kits/outline/outlineService";
import {
  lookupSystemRun,
  startSystemRun,
  type SystemRun,
} from "@/features/education/kits/systemRuns";
import type { KitTargetState } from "./types";

/** The system-workflow key of the kit build (aidream allow-list). */
export const KIT_BUILD_WORKFLOW_KEY = "education_kit_build";
/** The attribution the tab's generators carried, unchanged. */
export const KIT_BUILD_SOURCE_FEATURE = "education-ingest";
/** The run's name in its floating window. */
export const KIT_BUILD_LABEL = "Study kit outputs";

/**
 * Every output the server build makes (aidream `education_kit_build_v1.TARGETS`
 * — one step each). The kit picker offers exactly these; it never asks the
 * tab's own generator registry, which no longer builds a kit.
 */
export const KIT_BUILD_TARGETS: readonly TargetKind[] = [
  "deck",
  "quiz",
  "practice_test",
  "summary",
  "notes",
  "mind_map",
  "memory_aid",
  "audio",
];

/** True when the server build makes this output. */
export function kitBuildMakes(kind: TargetKind): boolean {
  return KIT_BUILD_TARGETS.includes(kind);
}

export interface KitBuildStart {
  kitId: string;
  organizationId: string;
  buildId: string;
  sourceSet: SourceSet;
  targets: readonly TargetKind[];
  options: ConvertOptions;
  title: string;
}

/** Start (or rejoin) the kit's build. */
export async function startKitBuild(
  dispatch: AppDispatch,
  input: KitBuildStart,
): Promise<{ runId: string; duplicate: boolean }> {
  if (input.targets.length === 0)
    throw new Error("Pick at least one thing to create.");
  return startSystemRun(
    dispatch,
    KIT_BUILD_WORKFLOW_KEY,
    {
      subject: kitOutlineSubject(input.kitId),
      organizationId: input.organizationId,
      sourceFeature: KIT_BUILD_SOURCE_FEATURE,
      inputs: {
        kit_id: input.kitId,
        build_id: input.buildId,
        source_set: input.sourceSet,
        targets: [...input.targets],
        title: input.title,
        focus: input.options.focus ?? "",
        difficulty: input.options.difficulty ?? "",
        depth: input.options.depth ?? "standard",
        // 0 = scale the count to the source (the server reads it so).
        count: input.options.count ?? 0,
      },
    },
    "The kit did not start building. Try again.",
  );
}

/** The kit's latest build run (active or finished), or null. */
export async function lookupKitBuildRun(
  dispatch: AppDispatch,
  kitId: string,
  organizationId: string | undefined,
): Promise<SystemRun | null> {
  return lookupSystemRun(
    dispatch,
    KIT_BUILD_WORKFLOW_KEY,
    kitOutlineSubject(kitId),
    organizationId,
    "Could not check the kit's progress.",
  );
}

function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

/**
 * The board's rows from the server run: each output's step (node id = kind)
 * → running (with its section progress), saved (its artifact), or failed (the
 * server's reason). A row the run has not reported yet keeps `base`'s state —
 * unless the run is `over`: then a row with no outcome says so, never a bar
 * that runs forever.
 */
export function kitTargetsFromRun(
  run: WorkflowRunState | null,
  base: readonly KitTargetState[],
  startedAt: number,
  over = false,
): KitTargetState[] {
  if (!run) return [...base];
  return base.map((t) => {
    const row = rowFromRun(run, t, startedAt);
    if (over && row.status === "running") {
      return {
        ...row,
        status: "error",
        error: "The build stopped before this was made. Continue to finish it.",
      };
    }
    return row;
  });
}

function rowFromRun(
  run: WorkflowRunState,
  t: KitTargetState,
  startedAt: number,
): KitTargetState {
  const aggregate = run.nodeAggregates[t.targetKind];
  const invocations = (aggregate?.invocationKeys ?? [])
    .map((key) => run.nodes[key])
    .filter((n) => n !== undefined);
  const last = invocations[invocations.length - 1];
  if (!last) return t;
  // The step's own clock, read off the run — never this render's time.
  const began =
    (last.startedAt ? Date.parse(last.startedAt) : NaN) || startedAt;
  const ended = last.durationMs !== null ? began + last.durationMs : undefined;
  if (last.phase === "failed") {
    const message =
      last.error?.message ?? `The ${t.label.toLowerCase()} could not be made.`;
    return {
      ...t,
      status: "error",
      error: message,
      errorCause: last.error,
      startedAt: began,
      finishedAt: ended,
    };
  }
  if (last.phase === "settled") {
    const artifact = obj(
      (Array.isArray(obj(last.output).artifacts)
        ? (obj(last.output).artifacts as unknown[])
        : [])[0],
    );
    const artifactId = str(artifact.artifact_id);
    if (!artifactId) return t;
    return {
      ...t,
      status: "success",
      href: str(artifact.href),
      title: str(artifact.title),
      detail: str(artifact.detail),
      artifactId,
      resourceType: str(artifact.artifact_type),
      stillGenerating: false,
      startedAt: began,
      finishedAt: ended,
    };
  }
  const progress = last.progress;
  return {
    ...t,
    status: "running",
    startedAt: began,
    coverage:
      progress && progress.total && progress.total > 1
        ? {
            done: progress.current ?? 0,
            total: progress.total,
            label: progress.message ?? "",
            items: 0,
          }
        : t.coverage,
  };
}
