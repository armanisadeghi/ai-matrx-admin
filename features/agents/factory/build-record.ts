/**
 * A kept agent's build record, read off `agent.definition.metadata`: the pipeline's
 * `agent_factory_build` (`outcome`, `run_id`, `kept_unproven`) and `agent_factory_first_runs`
 * (`status`, `needed`). Pure, so the shape is tested without a database.
 */

type Tone = "success" | "warning" | "destructive" | "neutral";

export interface AgentBuildRecordView {
  outcome: string;
  outcomeTone: Tone;
  buildId: string | null;
  firstRuns: { text: string; tone: Tone } | null;
}

function obj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function buildRecordOf(metadata: unknown): AgentBuildRecordView | null {
  const build = obj(obj(metadata)?.agent_factory_build);
  if (!build) return null;
  const outcome = typeof build.outcome === "string" && build.outcome ? build.outcome : "built";
  const unproven = outcome === "saved_unproven" || Boolean(build.kept_unproven);
  const buildId = typeof build.run_id === "string" ? build.run_id : typeof build.build_id === "string" ? build.build_id : null;
  const runs = obj(obj(metadata)?.agent_factory_first_runs);
  const status = typeof runs?.status === "string" ? runs.status : null;
  const needed = typeof runs?.needed === "number" ? runs.needed : null;
  const firstRuns = !status
    ? null
    : status === "passed"
      ? { text: "Passed", tone: "success" as const }
      : status === "failed"
        ? { text: "Failed", tone: "destructive" as const }
        : { text: needed ? `Waiting for ${needed} runs` : "Waiting", tone: "warning" as const };
  return { outcome, outcomeTone: unproven ? "warning" : "success", buildId, firstRuns };
}

/** The person's own page for one build (`app/(core)/agents/builds/[buildId]`). */
export const PERSON_BUILD_PATH = "/agents/builds";

/**
 * Where a build id opens: the person's own build page for everyone, the admin page (`adminBase`/{id}) only inside
 * the admin section. The Studio's Versions tab is a member's page, so it must never link the admin page
 * (review F-5: a member's link opened a page their account cannot read).
 */
export function buildPageHref(buildId: string, isAdmin: boolean, adminBase: string): string {
  return `${isAdmin ? adminBase : PERSON_BUILD_PATH}/${buildId}`;
}
