/**
 * Surface manifest — Brand strategy room (`matrx-user/marketing-brand-strategy`).
 *
 * Drives `/marketing/brands/[brandId]/identity/strategy` — `StrategyBriefWorkspace`
 * in brand scope: the staged-confidence brand strategy (`seo.landscape_brief`
 * rows, scope = brand) — the brief, the facts the AI established, the service
 * lines with their footprints, what the AI was unsure about, the owner's
 * corrections, and which version this is.
 *
 * Inherits the brand context from `matrx-user/marketing-brand` (the Identity
 * layout's `BrandIdentitySurface`); this room declares only its own layer.
 *
 * Runtime: `features/marketing/strategy/components/BrandStrategySurface.tsx`
 * (provider + write handler); values from `StrategyBriefWorkspace.tsx`.
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
    key: "strategy_document",
    label: "Strategy document",
    sortOrder: 100,
    description: "The written brief and the facts and service lines it rests on.",
  },
  {
    key: "strategy_review",
    label: "Review and corrections",
    sortOrder: 200,
    description:
      "What the AI was unsure about, the owner's standing corrections, and the unsaved draft.",
  },
  {
    key: "strategy_version",
    label: "Version",
    sortOrder: 300,
    description: "Which version this is, its review status, confidence, and what it was built from.",
  },
];

const surfaceSpecific: SurfaceValue[] = [
  {
    name: "strategy_brief_markdown",
    label: "Strategy brief",
    description:
      "The current brand strategy brief as markdown — what the business does, where it is, who it serves, its service lines. Empty when no strategy has been written yet or while it loads.",
    valueType: "document",
    alwaysAvailable: false,
    typicalCharCount: 3000,
    inlineUpTo: 6000,
    sortOrder: 300,
    group: "strategy_document",
  },
  {
    name: "strategy_facts",
    label: "Established facts",
    description:
      "The facts the AI established: { what_they_do, primary_location, customer_description } (strings; empty string = not established). Empty when no strategy exists yet.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 600,
    sortOrder: 310,
    group: "strategy_document",
  },
  {
    name: "strategy_service_lines",
    label: "Service lines",
    description:
      "One row per service line: { name, customer_segment, footprint (national | regional | local | radius | location_set | global | online), footprint_detail, why }. Empty array when none were established; absent when no strategy exists yet.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 1200,
    sortOrder: 320,
    group: "strategy_document",
  },
  {
    name: "strategy_open_questions",
    label: "AI is unsure about",
    description:
      "The questions the AI could not settle from the evidence, one string each. The owner answers them in the corrections. Empty array when the AI was sure of everything; absent when no strategy exists yet.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 400,
    sortOrder: 400,
    group: "strategy_review",
  },
  {
    name: "strategy_guidance",
    label: "Saved corrections",
    description:
      "The owner's saved corrections, in their own words. They outrank every inference and carry into every later version. Empty string when none are saved; absent when no strategy exists yet.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 400,
    sortOrder: 410,
    group: "strategy_review",
  },
  {
    name: "strategy_guidance_draft",
    label: "Corrections draft",
    description:
      "What is in the corrections box right now, saved or not. Equals strategy_guidance until the owner types. Absent when no strategy exists yet.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 400,
    sortOrder: 420,
    group: "strategy_review",
  },
  {
    name: "strategy_status",
    label: "Review status",
    description:
      "awaiting_review | confirmed | auto_accepted | draft. Absent when no strategy exists yet (then the only action is writing one).",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 20,
    sortOrder: 500,
    group: "strategy_version",
  },
  {
    name: "strategy_version_no",
    label: "Version number",
    description: "The version number of the strategy on screen. Absent when no strategy exists yet.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 3,
    sortOrder: 510,
    group: "strategy_version",
  },
  {
    name: "strategy_confidence",
    label: "AI confidence",
    description:
      "{ score: 1-5 | null, reason: string } — how sure the AI was of this version and why. Absent when no strategy exists yet.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 250,
    sortOrder: 520,
    group: "strategy_version",
  },
  {
    name: "strategy_built_from",
    label: "Built from",
    description:
      "What this version was built from, in plain words (e.g. \"a crawl of 983 pages\", \"the research report\"). Empty array when not recorded. Bindable only.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 200,
    autoContext: false,
    sortOrder: 530,
    group: "strategy_version",
  },
  {
    name: "strategy_history",
    label: "Earlier versions",
    description:
      "Every earlier version, newest first: { version_no, generated_at, reviewed_at, confidence, guidance, brief_markdown }. Empty array when this is the first version; absent while it loads or when no strategy exists. Bindable only.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 6000,
    autoContext: false,
    sortOrder: 540,
    group: "strategy_version",
  },
];

/**
 * The WRITE half. The corrections draft is the one thing an agent may put on
 * this page: it stages text in the corrections box and the OWNER confirms it.
 * The brief, facts and service lines are the analyst's output and change only
 * by writing a new version; status changes only by the owner's confirm.
 */
const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "strategy_guidance_draft",
    label: "Corrections draft",
    description:
      "Stage text in the strategy's corrections box. Value: string — the FULL corrections text (it replaces the box; include what is already in strategy_guidance_draft when adding to it). Write it the way the owner would say it out loud. Nothing is saved until the owner presses Confirm or Save.",
    valueType: "string",
    patchable: true,
    approvalComparison: "text-replacement",
    updatesValue: "strategy_guidance_draft",
    mode: "draft",
    applyPolicy: "ask",
    group: "strategy_review",
    sortOrder: 100,
  },
];

export const marketingBrandStrategyManifest: SurfaceManifest = {
  surfaceName: "matrx-user/marketing-brand-strategy",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description:
    "The brand strategy room — the brief, established facts, service lines, open questions, and the owner's corrections.",
  label: "Brand Strategy",
  situation:
    "They are in the brand's Strategy room: the brief, the facts the AI established, service lines and open questions (version {strategy_version_no|none yet}, {strategy_status|no strategy yet}). They can write corrections, which outrank everything the AI concluded.",
  urlPattern: "/marketing/brands/[brandId]/identity/strategy",
  inheritsFrom: "matrx-user/marketing-brand",
  intro: `<surface_intro>
You are on a brand's Strategy room: the business facts every website of this brand reads. Read brand_context first, then strategy_brief_markdown.
The strategy is written by the Brand Strategy Analyst and corrected by the owner. strategy_facts and strategy_service_lines are what the analyst concluded; strategy_open_questions are what it could not settle. strategy_guidance is the owner's saved correction and outranks every inference.
The useful work here is helping the owner correct it: answer the open questions from what is known, spot facts that contradict brand_context, and stage the correction in strategy_guidance_draft in the owner's own voice. The owner confirms; nothing you stage is saved on its own.
When strategy_status is absent there is no strategy yet.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection", "context"), surfaceSpecific),
  writeTargets,
  agentRoles: [
    {
      name: "brand_strategist",
      label: "Brand strategist",
      description:
        "Writes the brand strategy from the brand, every site's crawl and the research; runs from Write the brand strategy / Write a new version.",
      kind: "single",
      mandateKey: MANDATE_KEYS.seo__landscape_brief,
      defaultAgentId: null,
      autoRun: "never",
      sortOrder: 100,
    },
  ],
};

/**
 * Type-safe payload helper. Required keys ↔ every `alwaysAvailable: true`
 * value, INCLUDING the inherited `brand_id` from `matrx-user/marketing-brand`.
 */
export function createMarketingBrandStrategyScope(values: {
  // Inherited alwaysAvailable: true → required
  brand_id: string;
  // Inherited optionals (marketing-brand)
  brand_name?: string;
  brand_context?: string;
  brand_profile?: Record<string, unknown>;
  pending_review_count?: number;
  sites_summary?: ReadonlyArray<Record<string, unknown>>;
  properties_summary?: ReadonlyArray<Record<string, unknown>>;
  // Own (all optional — no strategy may exist yet)
  strategy_brief_markdown?: string;
  strategy_facts?: Record<string, unknown>;
  strategy_service_lines?: ReadonlyArray<Record<string, unknown>>;
  strategy_open_questions?: readonly string[];
  strategy_guidance?: string;
  strategy_guidance_draft?: string;
  strategy_status?: string;
  strategy_version_no?: number;
  strategy_confidence?: Record<string, unknown>;
  strategy_built_from?: readonly string[];
  strategy_history?: ReadonlyArray<Record<string, unknown>>;
  selection?: string;
  context?: Record<string, unknown>;
}): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
