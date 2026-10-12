/**
 * Smart Add Brand → the admin Builder panel (features/builder-panel). Everything this screen
 * holds, as keyed entries: the typed inputs, every round (a run of the identify workflow) and
 * the setup run, each finding with its certainty and source, the person's answers and the
 * comparison choices, the basics Create would save, and the provision point it declares.
 * Node outputs stream from SmartAddRound. A no-op for non-admins (the hook gates it).
 */
import type { BuilderPublishInput } from "@/features/builder-panel/types";
import type { MarketingBrand } from "@/features/marketing/types";
import type { Decision, EvidenceItem, RoundSeeds, confirmedBasics } from "./evidence";
import type { RelatedCandidate } from "./relations";
import type { RoundView } from "./SmartAddRound";

export const SMART_ADD_SURFACE = "marketing.brands.smart_add";

export interface SmartAddFeedState {
  inputs: { website: string; social: string; platform: string | null; person: boolean };
  rounds: { id: string; runId: string | null; seeds: RoundSeeds; error: string | null }[];
  views: Record<string, RoundView>;
  setup: { runId: string; view: RoundView | null } | null;
  items: EvidenceItem[];
  decisions: Record<string, Decision>;
  relations: Record<string, RelatedCandidate>;
  basics: ReturnType<typeof confirmedBasics>;
  created: MarketingBrand | null;
  provisionPoint: string;
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

  s.rounds.forEach((round, i) => {
    const label = `Identify round ${i + 1}`;
    out.push({
      key: `workflow.round.${round.id}`,
      label,
      group: "workflow",
      data: {
        runId: round.runId,
        seeds: round.seeds,
        error: round.error,
        status: round.runId ? (s.views[round.runId]?.status ?? null) : "starting",
        steps: round.runId ? (s.views[round.runId]?.steps ?? []) : [],
      },
      source: "smart_add_brand_identify",
      ref: round.runId ? { type: "workflow_run", id: round.runId, label } : null,
    });
  });
  if (s.setup) {
    out.push({
      key: "workflow.setup",
      label: "Setup run",
      group: "workflow",
      data: { runId: s.setup.runId, status: s.setup.view?.status ?? null, steps: s.setup.view?.steps ?? [] },
      source: "smart_add_brand_setup",
      ref: { type: "workflow_run", id: s.setup.runId, label: "Setup run" },
    });
  }

  // Every finding: its certainty, its source, and the person's answer.
  for (const item of s.items) {
    out.push({
      key: `finding.${item.key}`,
      label: `${item.field}: ${item.label ?? item.value}`.slice(0, 80),
      group: "findings",
      data: { ...item, decision: s.decisions[item.key] ?? null },
      source: item.source.where ?? item.source.kind,
      certainty: item.confidence,
    });
  }
  out.push({
    key: "findings.all",
    label: "All findings (table)",
    group: "findings",
    data: s.items.map((i) => ({
      field: i.field,
      value: i.value,
      certainty: i.confidence,
      source: i.source.where ?? i.source.kind,
      decision: s.decisions[i.key] ?? null,
      url: i.url,
    })),
    source: "SmartAddBrand",
  });
  out.push({ key: "choices.decisions", label: "Answers", group: "findings", data: s.decisions, source: "the person" });
  out.push({
    key: "choices.relations",
    label: "Comparison choices",
    group: "findings",
    data: Object.values(s.relations).map((r) => ({ candidate: r.candidate.id, label: r.candidate.anchor.value, relation: r.relation })),
    source: "Compare",
  });
  out.push({ key: "create.basics", label: "What Create saves", group: "findings", data: s.basics, source: "confirmed answers" });
  if (s.created) {
    out.push({ key: "create.brand", label: "Created brand", group: "findings", data: s.created, source: "createBrand" });
  }
  // Findings, rounds and the created brand are sets: what this screen no longer holds leaves.
  publish(out, { prune: ["finding.", "workflow.round.", "workflow.setup", "create.brand"] });
}
