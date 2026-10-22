/**
 * Surface manifest — Brand guidelines room (`matrx-user/marketing-brand-guidelines`).
 *
 * Drives `/marketing/brands/[brandId]/identity/guidelines` — `GuidelinesWorkbench` →
 * `KwGuidelinesPanel` for ONE website of the brand (`?site=` picks it): the
 * plain-text business guidelines every AI classification and valuation run for
 * that site reads first. The saved document, the unsaved text in the editor,
 * who last wrote it, and the AI drafts waiting for approval.
 *
 * Inherits the site context (and through it the brand context) from
 * `matrx-user/marketing-site` — the room renders inside
 * `BrandIdentitySiteSurface`.
 *
 * Runtime scope assembly + write handler:
 * `features/marketing/seo/value-system/guidelines/GuidelinesRoomSurface.tsx`
 * (editor state published from `KwGuidelinesPanel`).
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
    key: "guidelines_document",
    label: "Guidelines document",
    sortOrder: 100,
    description: "The saved guidelines text and the text currently in the editor.",
  },
  {
    key: "guidelines_provenance",
    label: "Provenance and drafts",
    sortOrder: 200,
    description: "Who last wrote the document, how old it is, and AI drafts waiting for approval.",
  },
];

const surfaceSpecific: SurfaceValue[] = [
  {
    name: "guidelines_text",
    label: "Saved guidelines",
    description:
      "The guidelines document as saved for this website — the text every AI classification and valuation run reads first. Empty string when the site has never had one written.",
    valueType: "document",
    alwaysAvailable: false,
    typicalCharCount: 2500,
    inlineUpTo: 6000,
    sortOrder: 110,
    group: "guidelines_document",
  },
  {
    name: "guidelines_draft_text",
    label: "Guidelines in the editor",
    description:
      "What is in the editor right now, saved or not. Equals guidelines_text until the person types. Absent while the saved document loads.",
    valueType: "document",
    alwaysAvailable: false,
    typicalCharCount: 2500,
    sortOrder: 120,
    group: "guidelines_document",
  },
  {
    name: "guidelines_has_unsaved_changes",
    label: "Has unsaved changes",
    description:
      "True when the editor text differs from the saved document. Absent while the saved document loads.",
    valueType: "boolean",
    alwaysAvailable: false,
    typicalCharCount: 5,
    sortOrder: 130,
    group: "guidelines_document",
  },
  {
    name: "guidelines_version",
    label: "Guidelines version",
    description:
      "Version number bumped on every save. 0 when the document has never been written. Absent while it loads.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 3,
    sortOrder: 210,
    group: "guidelines_provenance",
  },
  {
    name: "guidelines_last_edit",
    label: "Last edit",
    description:
      "{ updated_at (ISO), updated_by (name), age_days }. Absent when the document has never been written.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 100,
    sortOrder: 220,
    group: "guidelines_provenance",
  },
  {
    name: "guidelines_pending_draft_count",
    label: "Drafts waiting",
    description:
      "How many AI-proposed guideline edits for this website are waiting for a person to approve or reject. 0 when none. Their text lives in the approval queue, not here.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 2,
    sortOrder: 230,
    group: "guidelines_provenance",
  },
];

/**
 * The WRITE half. The editor text is the one thing an agent may put on this
 * page: it stages text in the editor and the PERSON presses Save. Nothing here
 * saves, approves or clears the stored document.
 */
const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "guidelines_draft_text",
    label: "Guidelines in the editor",
    description:
      "Stage text in the guidelines editor. Value: string — the FULL document (it replaces the editor; start from guidelines_draft_text when revising). Plain sentences that name terms beat rules. Nothing is saved until the person presses Save.",
    valueType: "string",
    patchable: true,
    approvalComparison: "text-replacement",
    updatesValue: "guidelines_draft_text",
    mode: "draft",
    applyPolicy: "ask",
    group: "guidelines_document",
    sortOrder: 100,
  },
];

export const marketingBrandGuidelinesManifest: SurfaceManifest = {
  surfaceName: "matrx-user/marketing-brand-guidelines",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description:
    "The brand Guidelines room — the business guidelines document one website's AI runs read first, the editor, and its provenance.",
  label: "Brand Guidelines",
  situation:
    "They are in the brand's Guidelines room: the business guidelines every AI run for this website reads first (version {guidelines_version|never saved}), open in an editor; unsaved changes: {guidelines_has_unsaved_changes|no}. {guidelines_pending_draft_count|No} AI-proposed edits wait for their review.",
  urlPattern: "/marketing/brands/[brandId]/identity/guidelines",
  inheritsFrom: "matrx-user/marketing-site",
  intro: `<surface_intro>
You are on a brand's Guidelines room: the plain-text business guidelines for one of its websites (site_name, site_root_url and brand_context arrive from the parent). Every AI classification and valuation run for that site reads this document first, so a sentence here changes what the AI decides.
Read guidelines_text (saved) and guidelines_draft_text (editor now). Good guidelines name the things a smart outsider would get wrong: what the business sells, who the good customer is, look-alike terms that are NOT the customer, and where it serves.
The useful work: check the document against brand_context and site_context, point out what is missing or out of date, and stage a revision in guidelines_draft_text. The person reads it and presses Save; nothing you stage is saved on its own.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection", "context"), surfaceSpecific),
  writeTargets,
  agentRoles: [
    {
      name: "guidelines_drafter",
      label: "Guidelines drafter",
      description:
        "Reads the site's own pages and drafts the guidelines document for approval; runs from Draft it from my site / Propose an update from my site.",
      kind: "single",
      mandateKey: MANDATE_KEYS.seo__guidelines_drafter,
      defaultAgentId: null,
      autoRun: "never",
      sortOrder: 100,
    },
  ],
};

/**
 * Type-safe payload helper. Required keys ↔ every `alwaysAvailable: true`
 * value, including the inherited `brand_id` and `site_id`.
 */
export function createMarketingBrandGuidelinesScope(values: {
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
  // Own (all optional)
  guidelines_text?: string;
  guidelines_draft_text?: string;
  guidelines_has_unsaved_changes?: boolean;
  guidelines_version?: number;
  guidelines_last_edit?: Record<string, unknown>;
  guidelines_pending_draft_count?: number;
  selection?: string;
  context?: Record<string, unknown>;
}): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
