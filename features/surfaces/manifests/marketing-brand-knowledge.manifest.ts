/**
 * Surface manifest — Brand knowledge room (`matrx-user/marketing-brand-knowledge`).
 *
 * Drives `/marketing/[brandId]/identity/knowledge` — the Business Discovery
 * Ladder (`DiscoveryPage` → `DiscoveryLadder`) for ONE website of the brand
 * (`?site=` picks it). AI reads the site cold and proposes, rung by rung:
 * business model, ideal customer, money map, offerings, offering values, the
 * proposed setup, and the business guidelines draft. The person reads each
 * result and runs the next; proposals are ruled in the approval queue.
 *
 * Inherits the site context (and through it the brand context) from
 * `matrx-user/marketing-site` — the room renders inside
 * `BrandIdentitySiteSurface`. This room declares only its own layer: the state
 * and result of each rung.
 *
 * Runtime scope assembly: `features/marketing/seo/value-system/discovery/KnowledgeRoomSurface.tsx`.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

const groups: SurfaceValueGroup[] = [
  {
    key: "ladder_progress",
    label: "Ladder progress",
    sortOrder: 100,
    description: "Which rungs have run on this website, when, and what is next.",
  },
  {
    key: "ladder_proposals",
    label: "Proposals waiting",
    sortOrder: 150,
    description: "The proposals the ladder has queued for the owner's ruling, and which rung is running right now.",
  },
  {
    key: "ladder_results",
    label: "Rung results",
    sortOrder: 200,
    description:
      "What each rung concluded, as the server holds it. Each is absent until that rung has run.",
  },
];

const RUNG_NOTE =
  "Absent until this rung has run on the selected website; re-running replaces it. It is the AI's proposal, not a ruling.";

const surfaceSpecific: SurfaceValue[] = [
  {
    name: "discovery_steps",
    label: "Discovery steps",
    description:
      "One row per rung, in ladder order: { step, title, implemented, status (not_run | completed | failed | ...), run_id (the server run for that rung, or null), completed_at (ISO | null), prerequisites_met (boolean) }. Empty array while the ladder loads.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 1200,
    sortOrder: 110,
    group: "ladder_progress",
  },
  {
    name: "discovery_completed_steps",
    label: "Completed steps",
    description:
      "Step keys that have a completed result, in ladder order (business_model, ideal_customer, money_map, offerings, offering_values, proposed_setup, guidelines_draft). Empty array when no rung has run.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 120,
    sortOrder: 120,
    group: "ladder_progress",
  },
  {
    name: "discovery_next_step",
    label: "Next runnable step",
    description:
      "The first ladder rung (in order) that has no result yet and whose prerequisites are met. Absent when every rung has run or none can run yet.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 20,
    sortOrder: 130,
    group: "ladder_progress",
  },
  {
    name: "discovery_running_step",
    label: "Running step",
    description:
      "The ladder rung whose Run / Re-run button was pressed and has not finished (a step key such as money_map). Absent when no rung is running. Per-row server run state is in discovery_steps (status, run_id).",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 20,
    sortOrder: 140,
    group: "ladder_progress",
  },
  {
    name: "discovery_pending_proposals",
    label: "Proposals waiting on the owner",
    description:
      "The offering and guideline-edit proposals this site's discovery steps queued and nobody has ruled, newest first, exactly the rows 'Discovery proposals waiting on you' shows: { key, kind (offering | guideline_edit), headline, accept_effect, reject_effect, proposed_by, proposed_at, agent_can_decide (boolean), left_to_person_because (why not, or null) }. Empty array when nothing waits; absent while the queue loads or if it failed to load.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 1500,
    sortOrder: 150,
    group: "ladder_proposals",
  },
  {
    name: "discovery_proposal_counts",
    label: "Proposal counts",
    description:
      "{ total, offering, guideline_edit } — how many discovery proposals wait on the owner, by kind. Absent while the queue loads.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 60,
    sortOrder: 160,
    group: "ladder_proposals",
  },
  {
    name: "discovery_business_model",
    label: "Business model",
    description: `Rung 1 result: { business_model, revenue_direction, model_explanation, what_they_sell[], what_they_buy_or_accept[], audience_notes, evidence[], confidence }. ${RUNG_NOTE}`,
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 2500,
    sortOrder: 210,
    group: "ladder_results",
  },
  {
    name: "discovery_ideal_customer",
    label: "Ideal customer",
    description: `Rung 2 result: { ideal_customers[], tire_kickers[], targeting_notes, confidence }. ${RUNG_NOTE}`,
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 2500,
    sortOrder: 220,
    group: "ladder_results",
  },
  {
    name: "discovery_money_map",
    label: "Money map",
    description: `Rung 3 result: { lines[] (name, earn_tier, reasoning), model_notes, confidence }. ${RUNG_NOTE}`,
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 2500,
    sortOrder: 230,
    group: "ladder_results",
  },
  {
    name: "discovery_offerings",
    label: "Offerings",
    description: `Rung 4 result: { offerings[] (name, kind, description, aliases[]), confidence }. ${RUNG_NOTE}`,
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 3000,
    sortOrder: 240,
    group: "ladder_results",
  },
  {
    name: "discovery_offering_values",
    label: "Offering values",
    description: `Rung 5 result: { baseline_note, valuations[] (offering, value_add in ± points from the 100-point baseline, reasoning), confidence }. ${RUNG_NOTE}`,
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 3000,
    sortOrder: 250,
    group: "ladder_results",
  },
  {
    name: "discovery_proposed_setup",
    label: "Proposed setup",
    description:
      "Rung 6 result (no AI — it turns rungs 4 and 5 into approval-queue proposals): { summary, proposals[] (name, offering_kind, value_add, status), skipped[] (name, reason) }. Absent until it has run.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 2000,
    sortOrder: 260,
    group: "ladder_results",
  },
  {
    name: "discovery_guidelines_draft",
    label: "Guidelines draft",
    description: `Business guidelines rung result: { summary, guidelines_text }. The text waits in the approval queue; nothing is saved to the site until a person approves it. ${RUNG_NOTE}`,
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 4000,
    autoContext: false,
    sortOrder: 270,
    group: "ladder_results",
  },
];

/**
 * One write target: ruling a pending discovery proposal, through the approval
 * queue's own decision writer (the same function its Approve / Reject buttons
 * call). The ladder's Run / Re-run buttons are NOT targets: they start paid AI
 * jobs and stay with the person. Proposals that must be read on their own (a
 * full guidelines document) are refused by the handler. Handler:
 * `features/marketing/seo/value-system/discovery/KnowledgeRoomSurface.tsx`.
 */
const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "discovery_proposal_decision",
    label: "Rule a discovery proposal",
    description:
      'Approve or reject one pending discovery proposal. Value: { item_key: string (a key from discovery_pending_proposals whose agent_can_decide is true), decision: "approve" | "reject", reason?: string }. Approve performs the exact write in that row\'s accept_effect (for an offering: the canonical offering writers) and Reject records the reason and never proposes that exact suggestion again, so it is asked of the owner first. Throws for an unknown key, an already-ruled proposal, or one left to the person.',
    valueType: "object",
    updatesValue: "discovery_pending_proposals",
    mode: "entity",
    applyPolicy: "ask",
    group: "ladder_proposals",
    sortOrder: 100,
  },
];

export const marketingBrandKnowledgeManifest: SurfaceManifest = {
  surfaceName: "matrx-user/marketing-brand-knowledge",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description:
    "The brand Knowledge room — the Business Discovery Ladder for one website: what the AI concluded at each rung and what is left to run.",
  label: "Brand Knowledge",
  situation:
    "They are in the brand's Knowledge room for this website: a ladder of discovery steps from business model and ideal customer to offerings, their worth and guidelines. Next step to run: {discovery_next_step|none left}; running now: {discovery_running_step|nothing}. They can accept or reject its {discovery_proposal_counts.total|no} waiting proposals.",
  urlPattern: "/marketing/[brandId]/identity/knowledge",
  inheritsFrom: "matrx-user/marketing-site",
  intro: `<surface_intro>
You are on a brand's Knowledge room: the Business Discovery Ladder for one of its websites (site_name, site_root_url and brand_context arrive from the parent). AI reads the site's own crawled pages cold and proposes, rung by rung: business model, ideal customer, money map, offerings, offering values, proposed setup, then a business guidelines draft.
Start with discovery_steps and discovery_next_step to see how far the ladder has climbed. Each discovery_* result is a proposal for the owner to read and rule, not established truth. A rung that is absent has not run.
Helping here means: spotting where one rung contradicts another or the brand context, saying what to re-run, and noting which proposals in discovery_pending_proposals look right or wrong. The owner runs rungs with the buttons on the page; you may rule a simple proposal with discovery_proposal_decision, which the owner confirms first.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection", "context"), surfaceSpecific),
  writeTargets,
  agentRoles: [
    {
      name: "business_model_analyst",
      label: "Business model analyst",
      description: "Reads the site cold and says what the business is and which way money flows; runs from the Run / Re-run button on step 1.",
      kind: "single",
      mandateKey: MANDATE_KEYS.seo__business_model_verdict,
      defaultAgentId: null,
      autoRun: "never",
      sortOrder: 100,
    },
    {
      name: "ideal_customer_analyst",
      label: "Ideal customer analyst",
      description: "Separates the customers who make money from the ones who only look like it; runs from the Run / Re-run button on step 2.",
      kind: "single",
      mandateKey: MANDATE_KEYS.seo__ideal_customer_profile,
      defaultAgentId: null,
      autoRun: "never",
      sortOrder: 110,
    },
    {
      name: "money_map_analyst",
      label: "Money map analyst",
      description: "Sorts the site's lines into big earners, loss leaders and noise; runs from the Run / Re-run button on step 3.",
      kind: "single",
      mandateKey: MANDATE_KEYS.seo__money_map,
      defaultAgentId: null,
      autoRun: "never",
      sortOrder: 120,
    },
    {
      name: "offering_extractor",
      label: "Offering extractor",
      description: "Lists what the site wants traffic to reach; runs from the Run / Re-run button on step 4.",
      kind: "single",
      mandateKey: MANDATE_KEYS.seo__offering_extraction,
      defaultAgentId: null,
      autoRun: "never",
      sortOrder: 130,
    },
    {
      name: "offering_valuer",
      label: "Offering valuer",
      description: "Proposes each offering's worth in points from the 100-point baseline; runs from the Run / Re-run button on step 5.",
      kind: "single",
      mandateKey: MANDATE_KEYS.seo__offering_valuation,
      defaultAgentId: null,
      autoRun: "never",
      sortOrder: 140,
    },
    {
      name: "guidelines_drafter",
      label: "Guidelines drafter",
      description: "Drafts the business guidelines document from the site's own pages; runs from the Run / Re-run button on the Business guidelines step.",
      kind: "single",
      mandateKey: MANDATE_KEYS.seo__guidelines_drafter,
      defaultAgentId: null,
      autoRun: "never",
      sortOrder: 150,
    },
  ],
};

/**
 * Type-safe payload helper. Required keys ↔ every `alwaysAvailable: true`
 * value, including the inherited `brand_id` and `site_id`.
 */
export function createMarketingBrandKnowledgeScope(values: {
  // Inherited alwaysAvailable: true → required
  brand_id: string;
  site_id: string;
  // Inherited optionals (marketing-brand, marketing-site)
  brand_name?: string;
  brand_context?: string;
  brand_profile?: Record<string, unknown>;
  site_name?: string;
  site_root_url?: string;
  site_description?: string;
  site_context?: string;
  connection_statuses?: Record<string, unknown>;
  initialization_state?: Record<string, unknown>;
  open_findings_total?: number;
  pages_total?: number;
  last_crawl_at?: string;
  gsc_synced_at?: string;
  // Own (all optional — a rung that has not run is absent)
  discovery_steps?: ReadonlyArray<Record<string, unknown>>;
  discovery_completed_steps?: readonly string[];
  discovery_next_step?: string;
  discovery_running_step?: string;
  discovery_pending_proposals?: ReadonlyArray<Record<string, unknown>>;
  discovery_proposal_counts?: Record<string, unknown>;
  discovery_business_model?: Record<string, unknown>;
  discovery_ideal_customer?: Record<string, unknown>;
  discovery_money_map?: Record<string, unknown>;
  discovery_offerings?: Record<string, unknown>;
  discovery_offering_values?: Record<string, unknown>;
  discovery_proposed_setup?: Record<string, unknown>;
  discovery_guidelines_draft?: Record<string, unknown>;
  selection?: string;
  context?: Record<string, unknown>;
}): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
