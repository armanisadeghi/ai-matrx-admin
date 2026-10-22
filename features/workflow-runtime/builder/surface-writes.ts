// Agent writes on the run page builder (surface `matrx-user/workflow-run-view-design`):
// pure readers of the agent's value, and the shapes the surface emits. Both targets are
// drafts — they change the builder's state; the person saves.

import { ProblemList } from "@ai-matrx/chat/surfaces/runtime/collection-write-targets";

import { describeSource, type Readout, type RunSurfaceConfig } from "../surface/config";
import type { SurfaceAudience, SurfaceProfile } from "../surface/service";
import type { SurfaceMeta } from "./BuildPane";

const AUDIENCES: readonly SurfaceAudience[] = ["consumer", "creator"];
const PROFILES: readonly SurfaceProfile[] = ["full", "compact", "summary"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function panelSurfaceRow(r: Readout) {
  return {
    id: r.id,
    title: r.title ?? "",
    shows: describeSource(r.source),
    screen_id: r.pageId ?? null,
    multi_run: r.multiRun ?? null,
    appears_on: r.visibility?.appearOn ?? null,
    hides_on: r.visibility?.hideOn ?? null,
  };
}

/** view_settings_draft → the merged meta (throws a sentence the agent can act on). */
export function mergeViewSettings(current: SurfaceMeta, value: unknown): SurfaceMeta {
  const problems = new ProblemList("view_settings_draft");
  if (!isRecord(value)) throw new Error('view_settings_draft: send an object like { "name": "…", "audience": "consumer" }.');
  const next: SurfaceMeta = { ...current };
  for (const [key, raw] of Object.entries(value)) {
    if (key === "name") {
      if (typeof raw !== "string" || !raw.trim()) problems.add('"name" must be non-empty text.');
      else next.name = raw.trim();
    } else if (key === "audience") {
      if (!AUDIENCES.includes(raw as SurfaceAudience)) problems.add('"audience" must be "consumer" or "creator".');
      else next.audience = raw as SurfaceAudience;
    } else if (key === "profile") {
      if (!PROFILES.includes(raw as SurfaceProfile)) problems.add('"profile" must be "full", "compact" or "summary".');
      else next.profile = raw as SurfaceProfile;
    } else {
      problems.add(`Unknown key "${key}".`);
    }
  }
  problems.throwIfAny();
  return next;
}

/** panel_titles_draft → the config with the new titles (throws on an unknown panel). */
export function retitlePanels(config: RunSurfaceConfig, value: unknown): RunSurfaceConfig {
  const problems = new ProblemList("panel_titles_draft");
  if (!isRecord(value)) throw new Error('panel_titles_draft: send an object like { "<panel id>": "New title" }.');
  const ids = new Set(config.readouts.map((r) => r.id));
  for (const [id, title] of Object.entries(value)) {
    if (!ids.has(id)) problems.add(`Unknown panel id "${id}" — use an id from panels.`);
    if (typeof title !== "string") problems.add(`The title for "${id}" must be text.`);
  }
  problems.throwIfAny();
  return {
    ...config,
    readouts: config.readouts.map((r) => {
      if (!(r.id in value)) return r;
      const title = (value[r.id] as string).trim();
      const { title: _old, ...rest } = r;
      return title ? { ...rest, title } : rest;
    }),
  };
}
