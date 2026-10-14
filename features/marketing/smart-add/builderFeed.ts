/**
 * Smart Add Brand → the admin Builder panel (features/builder-panel). Everything this screen
 * holds, as keyed entries, each exactly as the page holds it: the typed inputs and answers, every
 * round (a run of the identify workflow) and the setup run, the created brand, and the provision
 * point it declares. What the page COMPUTED (findings with certainty, what Create saves) is under
 * Derived and names its source step. Steps, requests and snapshots are read from the server by the
 * panel itself. A no-op for non-admins (the hook gates it).
 */
import type { BuilderPublishInput } from "@/features/builder-panel/types";
import type { MarketingBrand } from "@/features/marketing/types";
import type { Decision, EvidenceItem, RoundSeeds, confirmedBasics } from "./evidence";
import type { RelatedCandidate } from "./relations";
import type { FindLogEntry } from "./harder/types";
import type { SuggestContext, WebChoice, WebSuggestion } from "./webKinds";


export interface EnrichFeed {
  brandId: string;
  organizationId: string;
  known: { id: string; group: string; label: string; value: string; seeded: boolean }[];
  seed: unknown;
  diff: { id: string; kind: string; label: string; current: string | null; next: string | null; defaultChoice: string }[];
}

export interface SmartAddFeedState {
  inputs: { website: string; social: string; platform: string | null; person: boolean };
  rounds: { id: string; runId: string | null; seeds: RoundSeeds; error: string | null }[];
  setup: { runId: string } | null;
  items: EvidenceItem[];
  decisions: Record<string, Decision>;
  relations: Record<string, RelatedCandidate>;
  /** The "On the web" step: the person's answers, the rule suggestions shown, and the facts the rules read. */
  web: { choices: Record<string, WebChoice>; suggestions: Record<string, WebSuggestion | null>; context: SuggestContext };
  basics: ReturnType<typeof confirmedBasics>;
  created: MarketingBrand | null;
  provisionPoint: string;
  /** Person harder (PATHS.md person_harder): the path, path_history sent, every find-you decision and query. */
  /** Enrich an existing brand (ENRICH.md): the seeded known facts and the diff against the brand. */
  enrich?: EnrichFeed | null;
  findYou?: {
    path: unknown;
    history: unknown[];
    log: FindLogEntry[];
    pageAnchors: string[];
    anchors: string[];
  } | null;
}

export function publishSmartAddFeed(
  publish: (input: BuilderPublishInput[], options?: { prune?: string[] }) => void,
  s: SmartAddFeedState,
): void {
  const out: BuilderPublishInput[] = [
    { key: "input.website", label: "Website", group: "inputs", data: s.inputs.website, source: "typed" },
    { key: "input.social", label: "Social account", group: "inputs", data: s.inputs.social, source: "typed" },
    { key: "input.platform", label: "Platform pick", group: "inputs", data: s.inputs.platform, source: "picked" },
    { key: "input.kind", label: "Brand kind", group: "inputs", data: s.inputs.person ? "person" : "company", source: "picked" },
    {
      key: "mandate.provision_point",
      label: "Brand intake point",
      group: "mandates",
      data: { provisionPoint: s.provisionPoint },
      source: "SmartAddBrand",
      ref: { type: "mandate", provisionKey: s.provisionPoint },
    },
  ];

  // Each round as the page holds it (its run id, the seeds it started with, any start error). The run's
  // steps and their raw outputs and requests are read from the server in the Workflow / Requests tabs.
  s.rounds.forEach((round, i) => {
    const label = `Identify round ${i + 1}`;
    out.push({
      key: `workflow.round.${round.id}`,
      label,
      group: "workflow",
      data: round,
      source: "smart_add_brand_identify",
      ref: round.runId ? { type: "workflow_run", id: round.runId, label } : null,
    });
  });
  if (s.setup) {
    out.push({
      key: "workflow.setup",
      label: "Setup run",
      group: "workflow",
      data: { runId: s.setup.runId },
      source: "smart_add_brand_setup",
      ref: { type: "workflow_run", id: s.setup.runId, label: "Setup run" },
    });
  }

  // DERIVED — what this page computed from the steps' raw outputs: each finding exactly as the page
  // holds it (certainty, merged engines), naming the step it came from.
  for (const item of s.items) {
    out.push({
      key: `finding.${item.key}`,
      label: `${item.field}: ${item.label ?? item.value}`.slice(0, 80),
      group: "derived",
      data: item,
      source: item.source.where ?? item.source.kind,
      certainty: item.confidence,
      fromNodes: item.source.node && item.source.node !== "person" ? [item.source.node] : null,
    });
  }
  out.push({ key: "choices.decisions", label: "Answers", group: "inputs", data: s.decisions, source: "the person" });
  out.push({ key: "choices.relations", label: "Comparison choices", group: "inputs", data: s.relations, source: "the person" });
  out.push({ key: "choices.web", label: "On the web answers", group: "inputs", data: s.web.choices, source: "the person" });
  out.push({
    key: "derived.web_suggestions",
    label: "On the web suggestions (rules)",
    group: "derived",
    data: { suggestions: s.web.suggestions, read: s.web.context },
    source: "webKinds.suggestKind",
  });
  out.push({ key: "create.basics", label: "What Create saves", group: "derived", data: s.basics, source: "confirmed answers" });
  if (s.created) {
    out.push({
      key: "create.brand",
      label: "Created brand",
      group: "workflow",
      data: s.created,
      source: "createBrand",
      ref: { type: "record", id: s.created.id, table: "web.brand" },
    });
  }
  if (s.enrich) {
    out.push({
      key: "decisions.enrich",
      label: "Enrich: known facts and changes",
      group: "derived",
      data: s.enrich,
      source: "smart_add.enrich",
    });
  }
  if (s.findYou) {
    const anchor = [...s.findYou.log].reverse().find((e) => e.kind === "anchor") ?? null;
    out.push({
      key: "decisions.find_you",
      label: "Find you (person harder)",
      group: "derived",
      data: { ...s.findYou, anchorBucket: anchor?.bucket ?? null, anchorUrl: anchor?.url ?? null },
      source: "PersonHarderStage · aidream person_harder",
    });
  }
  // Findings, rounds and the created brand are sets: what this screen no longer holds leaves.
  publish(out, { prune: ["finding.", "workflow.round.", "workflow.setup", "create.brand", "decisions.find_you", "decisions.enrich"] });
}
