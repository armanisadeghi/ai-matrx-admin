import {
  xmlElement,
  xmlList,
  xmlText,
} from "@ai-matrx/chat/surfaces/runtime/context-bundle";
import type {
  ProofCheckStatus,
  ProofScenario,
  ProofRunSummary,
  ProofRunMode,
} from "./types";
export function proofRunsOverview(input: {
  loading: boolean;
  loaded: boolean;
  error: string | null;
  organizationRequired: boolean;
  selected: string;
  mode: ProofRunMode;
  running: string | null;
  checks: readonly ProofCheckStatus[];
  scenarios: readonly ProofScenario[];
  runs: readonly ProofRunSummary[];
  draft: { slug?: string; label?: string; mandate_key?: string } | null;
}): string {
  return xmlElement(
    "proof_runs",
    {
      loading: input.loading,
      data_loaded: input.loaded,
      organization_required: input.organizationRequired,
      selected_check: input.selected,
      run_mode: input.mode,
      running_check: input.running,
    },
    [
      xmlText("read_error", input.error, { max: 300 }),
      input.loaded
        ? xmlList(
            "checks",
            input.checks,
            (check) =>
              xmlElement("check", {
                slug: check.slug,
                label: check.label?.slice(0, 100),
              }),
            { maxRows: 12 },
          )
        : "",
      input.loaded
        ? xmlList(
            "scenarios",
            input.scenarios,
            (scenario) =>
              xmlElement(
                "scenario",
                {
                  slug: scenario.slug,
                  label: scenario.label.slice(0, 100),
                  mandate_key: scenario.mandate_key,
                  is_active: scenario.is_active,
                },
                xmlText("description", scenario.description, { max: 100 }),
              ),
            { maxRows: 12 },
          )
        : "",
      input.loaded
        ? xmlList(
            "recent_runs",
            input.runs,
            (run) =>
              xmlElement("run", {
                id: run.id,
                check_slug: run.check_slug,
                verdict: run.verdict,
                status: run.status,
                mode: run.mode,
              }),
            { maxRows: 8 },
          )
        : "",
      input.draft
        ? xmlElement("open_draft", {
            slug: input.draft.slug,
            label: input.draft.label,
            mandate_key: input.draft.mandate_key,
          })
        : "",
    ],
  );
}
