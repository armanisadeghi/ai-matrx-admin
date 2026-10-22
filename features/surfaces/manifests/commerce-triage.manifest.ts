/**
 * Surface manifest — Commerce warehouse triage (`matrx-user/commerce-triage`).
 *
 * `/commerce/triage` (gate 1): one captured asset at a time — its photos, the AI's
 * value-bucket call with confidence and reasoning — and five bucket keys.
 *
 * Emitter: `TriageQueue` (`features/commerce-review/components/`).
 * Write target: `value_bucket` decides the bucket of the asset in view through
 * `decideValueBucket`, the door the bucket keys use (a correction row plus the
 * asset's status write; the AI's own result is never edited).
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

export const COMMERCE_TRIAGE_SURFACE_NAME = "matrx-user/commerce-triage";

const groups: SurfaceValueGroup[] = [
  { key: "triage_queue", label: "Triage queue", sortOrder: 100, description: "Where the queue stands." },
  { key: "triage_item", label: "Asset in view", sortOrder: 200, description: "The one asset being triaged." },
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
  typicalCharCount: valueType === "number" ? 3 : 40,
  group,
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("queue_load_status", "Load status", "string", "triage_queue", 100, '"loading", "loaded" or "failed" (the read failed; the page offers a retry).', {
    alwaysAvailable: true,
    typicalCharCount: 10,
  }),
  v("queue_count", "Assets waiting", "number", "triage_queue", 110, "How many assets wait for a bucket (0 = the queue is empty)."),
  v("queue_position", "Position", "number", "triage_queue", 120, "Which asset of the queue is in view, counting from 1."),
  v("asset_id", "Asset ID", "string", "triage_item", 200, "UUID of the asset in view.", { typicalCharCount: 36 }),
  v("ai_bucket", "AI's bucket", "string", "triage_item", 210, "The AI's value-bucket call for it (empty when it made none)."),
  v(
    "triage_item",
    "Asset details",
    "object",
    "triage_item",
    220,
    "The asset in view as the card shows it: { asset_id, organization_id, pipeline_state, notes, is_gem_candidate, estimated_value, estimated_value_currency, ai_bucket, ai_confidence (0-1), ai_reasoning, photo_count, created_at }.",
    { typicalCharCount: 900 },
  ),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "value_bucket",
    label: "Decide the bucket",
    description:
      'Decide the value bucket of the asset in view, as a bucket key does; it then leaves the queue (no_value goes to recycling, anything else on to drafting). SAVED after the person approves. Value is one of "definite_value" | "conditional_value" | "possible_value" | "no_value" | "unknown". Refused: another word, or no asset in view.',
    valueType: "string",
    mode: "entity",
    applyPolicy: "ask",
    group: "triage_item",
    sortOrder: 300,
  },
];

const declared: SurfaceManifest = {
  surfaceName: COMMERCE_TRIAGE_SURFACE_NAME,
  situation:
    "They are triaging captured assets in the warehouse (page: {queue_load_status}): asset {queue_position|—} of {queue_count|0}, which the AI put in the {ai_bucket|no} bucket. You can decide its value bucket.",
  inheritsFrom: "matrx-default/commerce",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Commerce triage",
  description: "Warehouse triage: one captured asset at a time, the AI's value-bucket call, and the bucket decision.",
  urlPattern: "/commerce/triage",
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

export const commerceTriageManifest = declared;

export function createCommerceTriageScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
