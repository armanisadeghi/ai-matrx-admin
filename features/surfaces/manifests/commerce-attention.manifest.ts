/**
 * Surface manifest — Commerce attention (`matrx-user/commerce-attention`).
 *
 * `/commerce/attention`: the one list a person must see now — recall-audit
 * disagreements (the skeptic's second opinion vs the original bucket call),
 * escalations, high-impact open questions and blocked assets. Every row opens its
 * asset; recall rows take a verdict inline.
 *
 * Emitter: `AttentionQueue` (`features/commerce-review/components/`).
 * Write target: `record_verdicts` through `recordRecallVerdict`, the door the row's
 * three verdict buttons use. Other row kinds have no verdict (they open their asset
 * or the answer queue).
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

export const COMMERCE_ATTENTION_SURFACE_NAME = "matrx-user/commerce-attention";

const groups: SurfaceValueGroup[] = [
  { key: "attention_queue", label: "Attention queue", sortOrder: 100, description: "What needs a person now." },
];

const values: SurfaceValue[] = [
  {
    name: "queue_load_status",
    label: "Load status",
    description: '"loading", "loaded" or "failed" (the read failed; the page offers a retry).',
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 10,
    group: "attention_queue",
    sortOrder: 100,
  },
  {
    name: "attention_count",
    label: "Items",
    description: "How many items need attention (0 = nothing waiting).",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 3,
    group: "attention_queue",
    sortOrder: 110,
  },
  {
    name: "attention_items",
    label: "Attention items",
    description:
      'Every row, in order: { kind ("recall_disagreement" | "recall_escalation" | "high_impact_unknown" | "blocked_asset"), id, asset_id, organization_id, title, detail, created_at, and for recall rows: original { bucket, confidence }, challenger { bucket, confidence, reasoning, value_estimate }, value_delta, escalated_at }. Only recall rows take a verdict.',
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 3000,
    group: "attention_queue",
    sortOrder: 120,
  },
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "record_verdicts",
    label: "Record recall verdicts",
    description:
      'Record who was right on recall rows, as the row buttons do; each row then leaves the list. SAVED after the person approves. Value is a JSON ARRAY of 1-25 objects, each { "id": a recall row id from attention_items, "verdict": "original_correct" (the original call was right) | "challenge_correct" (the skeptic was right) | "inconclusive" }. Refused (nothing saved): an id that is not a recall row on screen, an id twice, another verdict word.',
    valueType: "array",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "attention_items",
    group: "attention_queue",
    sortOrder: 200,
  },
];

const declared: SurfaceManifest = {
  surfaceName: COMMERCE_ATTENTION_SURFACE_NAME,
  situation:
    "They are on the Commerce attention queue (page: {queue_load_status}): {attention_count|no} items need a person, such as AI calls a skeptic disagreed with and high-value open questions. You can record who was right on the recall rows.",
  inheritsFrom: "matrx-default/commerce",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Commerce attention",
  description: "What in Commerce needs a person now: recall disagreements, escalations, high-impact questions, blocked assets.",
  urlPattern: "/commerce/attention",
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), values),
  writeTargets,
};

export const commerceAttentionManifest = declared;

export function createCommerceAttentionScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
