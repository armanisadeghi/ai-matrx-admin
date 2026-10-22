/**
 * Surface manifest — Brand voice room (`matrx-user/marketing-brand-voice`).
 *
 * Drives `/marketing/brands/[brandId]/identity/voice` — `VoicePage` in brand scope:
 * how the brand writes, measured from real samples, confirmed by the owner,
 * and enforced on every draft. The page picks 5-20 samples, measures a voice
 * fingerprint, asks the owner to confirm the high-risk fields, and offers
 * "Fix voice" on a pasted draft.
 *
 * Inherits the brand context from `matrx-user/marketing-brand` (the Identity
 * layout's `BrandIdentitySurface`); this room declares only its own layer.
 *
 * Runtime: `features/marketing/voice/BrandVoiceSurface.tsx`. Measure
 * (`POST /brand-voice/extract`) and Confirm are not mandates, so only the
 * "Fix voice" rewrite is disclosed as an agent role.
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
    key: "voice_profile",
    label: "Measured voice",
    sortOrder: 100,
    description: "The newest measured voice, its fingerprint, and the saved voice line.",
  },
  {
    key: "voice_samples",
    label: "Samples",
    sortOrder: 200,
    description: "The writing the voice is measured from: what is picked and what could be picked.",
  },
  {
    key: "voice_confirm",
    label: "Confirmation",
    sortOrder: 300,
    description: "The measurement triage and the choices the owner makes before the voice is used.",
  },
  {
    key: "voice_fix",
    label: "Fix a draft",
    sortOrder: 400,
    description: "The draft being checked against the confirmed voice and the result.",
  },
];

const surfaceSpecific: SurfaceValue[] = [
  {
    name: "voice_whose",
    label: "Whose voice is shown",
    description:
      "\"brand\" when the page works on the brand's voice, \"me\" when the signed-in person is measuring their own voice as a spokesperson of this brand.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 6,
    sortOrder: 100,
    group: "voice_profile",
  },
  {
    name: "voice_current",
    label: "Current voice",
    description:
      "The newest measured voice: { status (draft | confirmed), confidence, register_label, sample_count, sample_word_count, last_extracted_at, refresh_due_at, confirmed_at }. A draft is not yet used to check drafts. Absent when no voice has been measured yet or while the saved voices load.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 300,
    sortOrder: 110,
    group: "voice_profile",
  },
  {
    name: "voice_fingerprint",
    label: "Voice fingerprint",
    description:
      "The full measured fingerprint behind the current voice (mechanics such as em-dash use, observed openers and closers, signature phrases, register, globally banned words found in the samples). Large and secondary. Absent when no voice has been measured. Bindable only.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 3000,
    autoContext: false,
    sortOrder: 120,
    group: "voice_profile",
  },
  {
    name: "voice_saved_summary_line",
    label: "Saved voice line",
    description:
      "The brand's one-line voice summary the last confirmation produced in this visit. Empty string or absent until the owner saves a confirmation on this page.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 200,
    sortOrder: 130,
    group: "voice_profile",
  },
  {
    name: "voice_spokespeople",
    label: "Spokespeople voices",
    description:
      "The signed-in person's own measured voices linked to this brand, one row each: { id, status, confidence, sample_count, last_extracted_at }. Empty array when none; absent while loading or for brands whose spokespeople could not be read.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 300,
    autoContext: false,
    sortOrder: 140,
    group: "voice_profile",
  },
  {
    name: "voice_samples_picked",
    label: "Samples picked",
    description:
      "The samples ticked for the next measurement: [{ source_id, name, kind, from ('source' | 'social') }]. A measurement needs 5 to 20. Empty array when none are picked.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 800,
    sortOrder: 200,
    group: "voice_samples",
  },
  {
    name: "voice_sample_candidates",
    label: "Sources that can be picked",
    description:
      "The Sources currently listed in the picker (filtered by the search box and by this-brand / all-my-sources): [{ source_id, name, created_at }]. Empty array when none match; absent while listing.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 1500,
    autoContext: false,
    sortOrder: 210,
    group: "voice_samples",
  },
  {
    name: "voice_social_candidates",
    label: "Social posts that can be picked",
    description:
      "The brand's own tracked social posts offered as samples: [{ post_id, platform, handle, text_kind, preview }]. Empty array when the brand tracks no accounts; absent while listing or when working on a personal voice.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 1500,
    autoContext: false,
    sortOrder: 220,
    group: "voice_samples",
  },
  {
    name: "voice_search_query",
    label: "Source search text",
    description: "What is typed in the Sources search box. Empty string when blank.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 30,
    autoContext: false,
    sortOrder: 230,
    group: "voice_samples",
  },
  {
    name: "voice_measure_triage",
    label: "What the samples show",
    description:
      "The result of the last Measure run in this visit: { sample_count, total_words, ai_tell_share (0-1), register_split (boolean), confidence, warnings[], saved (boolean — false when too little writing to save) }. Absent until a measurement has been run on this page.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 400,
    sortOrder: 300,
    group: "voice_confirm",
  },
  {
    name: "voice_confirm_choices",
    label: "Confirmation choices",
    description:
      "Present only while a measured voice waits for the owner's confirmation: { em_dash_usage (never | rare | habitual; measured_em_dash_usage is what the samples showed), register_label, openers / closers / signature_phrases / banned_words_allowed: { offered[], kept[] } }. kept is what is ticked right now. Absent when no voice is waiting for confirmation.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 900,
    sortOrder: 310,
    group: "voice_confirm",
  },
  {
    name: "voice_fix_draft",
    label: "Draft to fix",
    description:
      "The text in the \"Fix a draft's voice\" box right now. Empty string when blank. Absent until a voice is confirmed (the box does not exist before that).",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 800,
    sortOrder: 400,
    group: "voice_fix",
  },
  {
    name: "voice_fix_surface",
    label: "Where the draft will appear",
    description:
      "pitch | reactive | social | newsletter — the channel the draft is checked for. Absent until a voice is confirmed.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 10,
    sortOrder: 410,
    group: "voice_fix",
  },
  {
    name: "voice_fix_outcome",
    label: "Fix result",
    description:
      "The last \"Fix voice\" result: { status (passed | fixed | failed), retries, initial_tells[], text (the returned draft) }. Absent until Fix voice has been run on this page.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 1000,
    sortOrder: 420,
    group: "voice_fix",
  },
];

/**
 * The WRITE half. Everything an agent puts on this page is staged for the
 * owner: samples are ticked, confirmation choices are set, and a draft is
 * pasted into the fix box. The owner still presses Measure voice, Save voice
 * and Fix voice; nothing here runs a measurement or saves a confirmation.
 */
const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "voice_samples_picked",
    label: "Samples picked",
    description:
      "Tick the samples for the next measurement. Value: [{ source_id: string (a source_id from voice_sample_candidates, or \"social:<post_id>\" from voice_social_candidates), kind?: \"email\"|\"slack\"|\"tweet\"|\"linkedin\"|\"blog\"|\"pitch\"|\"substack\"|\"other\", default other }] — the FULL list; it replaces the ticks (5 to 20 for a measurement). The owner presses Measure voice.",
    valueType: "array",
    updatesValue: "voice_samples_picked",
    mode: "draft",
    applyPolicy: "ask",
    group: "voice_samples",
    sortOrder: 100,
  },
  {
    name: "voice_confirm_choices",
    label: "Confirmation choices",
    description:
      "Set the choices on the \"Confirm before it is used\" card. Value: { em_dash_usage?: \"never\"|\"rare\"|\"habitual\", register_label?: \"formal\"|\"professional\"|\"casual-professional\"|\"casual\"|\"irreverent\", openers_kept?: string[], closers_kept?: string[], signature_phrases_kept?: string[], banned_words_allowed?: string[] } — each list must use only items offered in voice_confirm_choices; only the fields you pass change. The owner presses Save voice; until then the voice is not used.",
    valueType: "object",
    updatesValue: "voice_confirm_choices",
    mode: "draft",
    applyPolicy: "ask",
    group: "voice_confirm",
    sortOrder: 200,
  },
  {
    name: "voice_fix_draft",
    label: "Draft to fix",
    description:
      "Put text in the \"Fix a draft's voice\" box. Value: string — the FULL draft (it replaces the box). Only works once a voice is confirmed. The owner presses Fix voice.",
    valueType: "string",
    patchable: true,
    approvalComparison: "text-replacement",
    updatesValue: "voice_fix_draft",
    mode: "draft",
    applyPolicy: "ask",
    group: "voice_fix",
    sortOrder: 300,
  },
  {
    name: "voice_fix_surface",
    label: "Where the draft will appear",
    description:
      "Choose the channel for the draft check. Value: one of pitch | reactive | social | newsletter. Only works once a voice is confirmed.",
    valueType: "string",
    updatesValue: "voice_fix_surface",
    mode: "draft",
    applyPolicy: "ask",
    group: "voice_fix",
    sortOrder: 310,
  },
];

export const marketingBrandVoiceManifest: SurfaceManifest = {
  surfaceName: "matrx-user/marketing-brand-voice",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description:
    "The brand voice room — the measured voice, its writing samples, the owner's confirmation, and the draft voice fixer.",
  label: "Brand Voice",
  situation:
    "They are in the brand's Voice room (whose voice: {voice_whose|brand}); the measured voice is {voice_current.status|not measured yet}. They can pick writing samples and measure the voice, confirm the result, or paste a draft into the fixer to bring it into the voice.",
  urlPattern: "/marketing/brands/[brandId]/identity/voice",
  inheritsFrom: "matrx-user/marketing-brand",
  intro: `<surface_intro>
You are on a brand's Voice room: how the brand writes, measured from its real writing and confirmed by its owner. Read brand_context first, then voice_current.
The voice is a measured fingerprint, not a style guide. Until the owner confirms it (voice_confirm_choices present = waiting), nothing checks drafts against it. The owner picks 5 to 20 real samples, presses Measure voice, corrects the high-risk fields (em dashes, register, openers, closers, signature phrases, banned words they really use), then saves.
The useful work here is helping the owner choose good samples (recent, unedited, their own words), noticing when the triage warns of AI-edited samples or a split register, and staging choices in voice_samples_picked and voice_confirm_choices. Once a voice is confirmed you can stage a draft in voice_fix_draft for the voice check. The owner runs every button; nothing you stage measures, saves or rewrites on its own.
When voice_current is absent no voice has been measured yet.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection", "context"), surfaceSpecific),
  writeTargets,
  agentRoles: [
    {
      name: "voice_fixer",
      label: "Voice fixer",
      description:
        "Rewrites a draft so it matches the brand's confirmed voice, span by span with every fact kept; runs from Fix voice.",
      kind: "single",
      mandateKey: MANDATE_KEYS.brand__voice_rewrite,
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
export function createMarketingBrandVoiceScope(values: {
  // Inherited alwaysAvailable: true → required
  brand_id: string;
  // Inherited optionals (marketing-brand)
  brand_name?: string;
  brand_context?: string;
  brand_profile?: Record<string, unknown>;
  pending_review_count?: number;
  sites_summary?: ReadonlyArray<Record<string, unknown>>;
  properties_summary?: ReadonlyArray<Record<string, unknown>>;
  // Own (all optional — no voice may exist yet)
  voice_whose?: string;
  voice_current?: Record<string, unknown>;
  voice_fingerprint?: Record<string, unknown>;
  voice_saved_summary_line?: string;
  voice_spokespeople?: ReadonlyArray<Record<string, unknown>>;
  voice_samples_picked?: ReadonlyArray<Record<string, unknown>>;
  voice_sample_candidates?: ReadonlyArray<Record<string, unknown>>;
  voice_social_candidates?: ReadonlyArray<Record<string, unknown>>;
  voice_search_query?: string;
  voice_measure_triage?: Record<string, unknown>;
  voice_confirm_choices?: Record<string, unknown>;
  voice_fix_draft?: string;
  voice_fix_surface?: string;
  voice_fix_outcome?: Record<string, unknown>;
  selection?: string;
  context?: Record<string, unknown>;
}): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
