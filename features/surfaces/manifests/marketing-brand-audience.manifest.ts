/**
 * Surface manifest — Brand audience room (`matrx-user/marketing-brand-audience`).
 *
 * Drives `/marketing/[brandId]/identity/audience` — `BrandAudiencePage`: the
 * named personas (`web.brand_persona`) every brief and agent writes for — each
 * with its summary, demographics, goals, pain points, objections and channels,
 * and which one is primary.
 *
 * Inherits the brand context from `matrx-user/marketing-brand` (the Identity
 * layout's `BrandIdentitySurface`); this room declares only its own layer.
 * The brand's `brand_context` XML already carries a compact persona list;
 * this surface adds the full records and the editor.
 *
 * Runtime: `features/marketing/components/brand/BrandAudienceSurface.tsx`.
 * No AI job runs from this room, so there are no `agentRoles`.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

const groups: SurfaceValueGroup[] = [
  {
    key: "audience_personas",
    label: "Personas",
    sortOrder: 100,
    description: "The named audiences this brand sells to, in full.",
  },
  {
    key: "audience_editor",
    label: "Persona editor",
    sortOrder: 200,
    description: "The persona editor dialog, when it is open, and the fields it offers.",
  },
];

const surfaceSpecific: SurfaceValue[] = [
  {
    name: "audience_personas",
    label: "Personas",
    description:
      "One row per persona on the page, in list order: { id, name, summary, demographics ({ age_range, location, job_titles, income, company_size, life_stage, interests, platforms } — only the ones filled in), goals[], pain_points[], objections[], channels[], is_primary, version }. Empty array when the brand has no personas yet; absent while the list loads or if it failed to load.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 2000,
    sortOrder: 100,
    group: "audience_personas",
  },
  {
    name: "audience_persona_count",
    label: "Persona count",
    description: "How many personas the brand has. Absent while the list loads.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 3,
    sortOrder: 110,
    group: "audience_personas",
  },
  {
    name: "audience_primary_persona",
    label: "Primary persona",
    description:
      "The persona marked primary (same shape as one row of audience_personas). Absent when none is marked primary or the brand has no personas.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 500,
    sortOrder: 120,
    group: "audience_personas",
  },
  {
    name: "audience_noun",
    label: "What this brand calls its audience",
    // brand-word-ok: the brand's own customers may be called clients
    description:
      "The word the page uses for one persona for this kind of brand (for example customer, client, follower). Use it when writing persona text so it matches the page.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 12,
    sortOrder: 130,
    group: "audience_personas",
  },
  {
    name: "audience_editor",
    label: "Open persona editor",
    description:
      "Present only while the persona editor dialog is open: { mode: \"new\" | \"edit\", persona_id: string | null (the persona being edited; null when new) }. Absent when the editor is closed.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 80,
    sortOrder: 200,
    group: "audience_editor",
  },
  {
    name: "audience_demographic_fields",
    label: "Demographic fields offered",
    description:
      "The demographic fields the editor offers for this brand's kind: [{ key, label }]. persona_draft.demographics accepts only these keys.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 300,
    autoContext: false,
    sortOrder: 210,
    group: "audience_editor",
  },
];

/**
 * The WRITE half. The one thing an agent may put on this page is a persona
 * DRAFT: it opens the persona editor (new, or an existing persona) pre-filled
 * and the OWNER presses Save. Nothing is saved or deleted by the agent.
 */
const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "persona_draft",
    label: "Persona draft",
    description:
      "Open the persona editor pre-filled with a draft; the owner reviews and presses Save (nothing is saved until then). Value: { persona_id?: string (an id from audience_personas to edit that persona; omit to draft a NEW persona), name?: string (required when new), summary?: string, demographics?: { <key from audience_demographic_fields>: string }, goals?: string[], pain_points?: string[], objections?: string[], channels?: string[], is_primary?: boolean }. Only the fields you pass are filled; when editing, the rest keep the persona's current values. Write in the owner's own words and the audience_noun.",
    valueType: "object",
    updatesValue: "audience_editor",
    mode: "draft",
    applyPolicy: "ask",
    group: "audience_editor",
    sortOrder: 100,
  },
];

export const marketingBrandAudienceManifest: SurfaceManifest = {
  surfaceName: "matrx-user/marketing-brand-audience",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description:
    "The brand audience room — the named personas the brand sells to, with their goals, pain points, objections and channels.",
  label: "Brand Audience",
  situation:
    "They are in the brand's Audience room: {audience_persona_count|the} named personas the brand sells to, each with goals, pain points, objections and channels. They can add or edit a persona in the editor.",
  urlPattern: "/marketing/[brandId]/identity/audience",
  inheritsFrom: "matrx-user/marketing-brand",
  intro: `<surface_intro>
You are on a brand's Audience room: the named personas every brief and agent writes for. Read brand_context first, then audience_personas.
Each persona is a real audience the owner defined: who they are (demographics), what they want (goals), what holds them back (pain_points, objections) and where to reach them (channels). One may be primary.
The useful work here is helping the owner sharpen the audience: spot gaps, vague or contradictory personas, and facts in brand_context that no persona reflects, then stage a persona in persona_draft. It opens the editor pre-filled and the owner saves; nothing you stage is saved or removed on its own.
When audience_personas is an empty array the brand has no personas yet.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection", "context"), surfaceSpecific),
  writeTargets,
};

/**
 * Type-safe payload helper. Required keys ↔ every `alwaysAvailable: true`
 * value, INCLUDING the inherited `brand_id` from `matrx-user/marketing-brand`.
 */
export function createMarketingBrandAudienceScope(values: {
  // Inherited alwaysAvailable: true → required
  brand_id: string;
  // Inherited optionals (marketing-brand)
  brand_name?: string;
  brand_context?: string;
  brand_profile?: Record<string, unknown>;
  pending_review_count?: number;
  sites_summary?: ReadonlyArray<Record<string, unknown>>;
  properties_summary?: ReadonlyArray<Record<string, unknown>>;
  // Own (all optional — the list may not have loaded)
  audience_personas?: ReadonlyArray<Record<string, unknown>>;
  audience_persona_count?: number;
  audience_primary_persona?: Record<string, unknown>;
  audience_noun?: string;
  audience_editor?: Record<string, unknown>;
  audience_demographic_fields?: ReadonlyArray<Record<string, unknown>>;
  selection?: string;
  context?: Record<string, unknown>;
}): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
