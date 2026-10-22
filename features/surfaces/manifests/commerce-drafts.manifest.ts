/**
 * Surface manifest — Commerce draft review (`matrx-user/commerce-drafts`).
 *
 * `/commerce/drafts` (gate 2): one AI listing draft at a time — photos, the draft's
 * fields (title, description, price, item specifics), its confidence and reasoning —
 * edited in place, then approved, sent back for revision or rejected.
 *
 * Emitter: `DraftReviewQueue` (`features/commerce-review/components/`).
 * Write targets:
 *   - `draft_field_edits` / `draft_description` (DRAFT) fill the fields on screen;
 *     nothing is saved until a verdict is given.
 *   - `review_verdict` gives the verdict through `reviewDraft`, the door the
 *     Approve / Revise / Reject buttons use, with the fields as edited (each edit
 *     lands as a correction; the AI's draft row is never touched).
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

export const COMMERCE_DRAFTS_SURFACE_NAME = "matrx-user/commerce-drafts";

const groups: SurfaceValueGroup[] = [
  { key: "drafts_queue", label: "Draft queue", sortOrder: 100, description: "Where the queue stands." },
  { key: "draft_in_view", label: "Draft in view", sortOrder: 200, description: "The one listing draft under review." },
];

const v = (
  name: string,
  label: string,
  valueType: SurfaceValue["valueType"],
  group: string,
  sortOrder: number,
  description: string,
  extra: Partial<SurfaceValue> = {},
): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 40,
  group,
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("queue_load_status", "Load status", "string", "drafts_queue", 100, '"loading", "loaded" or "failed" (the read failed; the page offers a retry).', {
    alwaysAvailable: true,
    typicalCharCount: 10,
  }),
  v("queue_count", "Drafts waiting", "number", "drafts_queue", 110, "How many drafts wait for review (0 = the queue is empty)."),
  v("queue_position", "Position", "number", "drafts_queue", 120, "Which draft of the queue is in view, counting from 1."),
  v("asset_id", "Asset ID", "string", "draft_in_view", 200, "UUID of the asset whose draft is in view.", { typicalCharCount: 36 }),
  v("draft_title", "Listing title", "string", "draft_in_view", 210, "The draft's title as it stands on screen (edits included).", {
    typicalCharCount: 80,
    inlineUpTo: 300,
  }),
  v(
    "draft_description",
    "Listing description",
    "string",
    "draft_in_view",
    220,
    "The draft's description as it stands on screen (edits included). Empty when the draft has no description field.",
    { typicalCharCount: 800, inlineUpTo: 4000 },
  ),
  v(
    "draft_fields",
    "Draft fields",
    "array",
    "draft_in_view",
    230,
    "Every field of the draft: { path (\"title\" | \"description\" | \"price\" | \"aspect:<name>\" …), label, value (as on screen), ai_value (the AI's), edited }.",
    { typicalCharCount: 1500 },
  ),
  v("has_unsaved_edits", "Unsaved edits", "boolean", "draft_in_view", 240, "True when a field on screen differs from the AI's draft."),
  v(
    "draft_details",
    "Draft details",
    "object",
    "draft_in_view",
    250,
    "{ organization_id, confidence (0-1), reasoning (why the AI drafted it so), notes (the capture notes), photo_count, created_at }.",
    { typicalCharCount: 900 },
  ),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "draft_field_edits",
    label: "Edit draft fields",
    description:
      'Change fields of the draft in view on screen. NOTHING is saved until a verdict is given (review_verdict or the buttons). Value is a JSON object { "<path from draft_fields>": "new value" }, e.g. { "title": "…", "price": "24.99" }; only the paths you send change. Refused: an unknown path, a value that is not text, no draft in view.',
    valueType: "object",
    mode: "draft",
    applyPolicy: "ask",
    updatesValue: "draft_fields",
    group: "draft_in_view",
    sortOrder: 300,
  },
  {
    name: "draft_description",
    label: "Rewrite the description",
    description:
      "Replace (or patch) the listing description of the draft in view on screen. NOTHING is saved until a verdict is given. Value is the full new description text. Refused: no draft in view, or a draft without a description field.",
    valueType: "string",
    approvalComparison: "text-replacement",
    mode: "draft",
    applyPolicy: "ask",
    updatesValue: "draft_description",
    patchable: true,
    group: "draft_in_view",
    sortOrder: 310,
  },
  {
    name: "review_verdict",
    label: "Approve, revise or reject",
    description:
      'Give the verdict on the draft in view with its fields as they stand on screen, as the buttons do; it then leaves the queue. SAVED after the person approves. Value is "approve" | "revise" (send it back for another draft) | "reject". Refused: another word, or no draft in view.',
    valueType: "string",
    mode: "entity",
    applyPolicy: "ask",
    group: "draft_in_view",
    sortOrder: 320,
  },
];

const declared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: COMMERCE_DRAFTS_SURFACE_NAME,
  situation:
    "They are reviewing AI listing drafts (page: {queue_load_status}): draft {queue_position|—} of {queue_count|0}, titled \"{draft_title|untitled}\". Unsaved edits: {has_unsaved_edits|no}. You can edit its fields or description, then approve, revise or reject it.",
  inheritsFrom: "matrx-default/commerce",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Commerce draft review",
  description: "Listing draft review: one AI draft at a time, edited in place, then approved, revised or rejected.",
  urlPattern: "/commerce/drafts",
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

export const commerceDraftsManifest = declared;

export function createCommerceDraftsScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
