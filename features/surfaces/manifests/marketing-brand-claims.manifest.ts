/**
 * Surface manifest — Brand claims room (`matrx-user/marketing-brand-claims`).
 *
 * Drives `/marketing/[brandId]/identity/claims` — `BrandClaimsPage`: approved
 * claims, forbidden claims and disclaimers. Every value is the page AS IT IS
 * ON SCREEN (unsaved edits included). The room runs no AI job today.
 *
 * Inherits the brand context from `matrx-user/marketing-brand`; the whole
 * stored profile is the parent's `brand_profile` and is not re-declared.
 * Runtime: `features/marketing/components/brand/BrandProfilePages.tsx`
 * (`ClaimsEditor`) over `BrandRoomSurface`.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import {
  mergeBaselineValues,
  pickBaseline,
} from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

const groups: SurfaceValueGroup[] = [
  {
    key: "claims_all",
    label: "Whole page",
    sortOrder: 50,
    description: "All three claim lists in one object.",
  },
  {
    key: "claims_lists",
    label: "Claims and wording",
    sortOrder: 100,
    description:
      "What may be said, what never may, and the required legal wording.",
  },
];

const surfaceSpecific: SurfaceValue[] = [
  {
    name: "claims_profile",
    label: "Claims page (all lists)",
    description:
      "{ approved_claims, forbidden_claims, disclaimers } — each a string array, as currently edited. Empty arrays = nothing written. Absent while the brand loads.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 900,
    autoContext: false,
    sortOrder: 60,
    group: "claims_all",
  },
  {
    name: "claims_approved",
    label: "Approved claims",
    description:
      "Statements the brand may make exactly as written, one string each. Empty array when none are written.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 400,
    sortOrder: 110,
    group: "claims_lists",
  },
  {
    name: "claims_forbidden",
    label: "Forbidden claims",
    description:
      "Statements the brand must never make in any channel, one string each. Empty array when none are written.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 400,
    sortOrder: 120,
    group: "claims_lists",
  },
  {
    name: "claims_disclaimers",
    label: "Disclaimers",
    description:
      "Required legal wording to attach where it applies, one string each. Empty array when none are written.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 400,
    sortOrder: 130,
    group: "claims_lists",
  },
];

const DRAFT =
  "Value: string[] — the FULL list; it replaces the box (include existing lines to keep them); empty array clears. Stages the change on the page; nothing is saved until the person presses Save.";

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "claims_approved",
    label: "Approved claims",
    description: `Stage the approved-claims list. ${DRAFT}`,
    valueType: "array",
    updatesValue: "claims_approved",
    mode: "draft",
    applyPolicy: "ask",
    group: "claims_lists",
    sortOrder: 100,
  },
  {
    name: "claims_forbidden",
    label: "Forbidden claims",
    description: `Stage the forbidden-claims list. ${DRAFT}`,
    valueType: "array",
    updatesValue: "claims_forbidden",
    mode: "draft",
    applyPolicy: "ask",
    group: "claims_lists",
    sortOrder: 110,
  },
  {
    name: "claims_disclaimers",
    label: "Disclaimers",
    description: `Stage the disclaimers list. ${DRAFT}`,
    valueType: "array",
    updatesValue: "claims_disclaimers",
    mode: "draft",
    applyPolicy: "ask",
    group: "claims_lists",
    sortOrder: 120,
  },
];

export const marketingBrandClaimsManifest: SurfaceManifest = {
  surfaceName: "matrx-user/marketing-brand-claims",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description:
    "The brand claims room — approved claims, forbidden claims and required disclaimers.",
  label: "Brand Claims",
  situation:
    "They are in the brand's Claims room: statements the brand may make word for word, statements it must never make, and required disclaimers. They can add, change or remove items in any of the three lists.",
  urlPattern: "/marketing/[brandId]/identity/claims",
  inheritsFrom: "matrx-user/marketing-brand",
  intro: `<surface_intro>
You are on a brand's Claims room, where the owner lists what the brand may say as written, what it must never say, and the legal wording to attach. Read brand_context first, then the claims_* values, which are the page exactly as it is on screen, unsaved edits included.
Claims are compliance-sensitive: help the owner word them precisely and spot conflicts between lists, but never invent a claim the brand has not made. Stage changes with the claims_* write targets; the owner reviews and presses Save, nothing you stage is saved on its own.
An empty array means the owner has not written any yet.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(
    pickBaseline("selection", "context"),
    surfaceSpecific,
  ),
  writeTargets,
};

export function createMarketingBrandClaimsScope(values: {
  brand_id: string;
  brand_name?: string;
  brand_context?: string;
  brand_profile?: Record<string, unknown>;
  pending_review_count?: number;
  sites_summary?: ReadonlyArray<Record<string, unknown>>;
  properties_summary?: ReadonlyArray<Record<string, unknown>>;
  claims_profile?: Record<string, unknown>;
  claims_approved?: readonly string[];
  claims_forbidden?: readonly string[];
  claims_disclaimers?: readonly string[];
  selection?: string;
  context?: Record<string, unknown>;
}): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
