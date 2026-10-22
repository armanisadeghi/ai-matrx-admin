// Agent writes on the three commerce review queues (surfaces
// `matrx-user/commerce-attention`, `-triage`, `-drafts`): pure readers of the
// agent's value, and the row shapes the surfaces emit. Saving goes through the
// queues' own doors (recordRecallVerdict, decideValueBucket, reviewDraft).

import {
  collectProblems,
  ListLevelProblem,
  ProblemList,
  readCollectionList,
  repeatsProblem,
} from "@ai-matrx/chat/surfaces/runtime/collection-write-targets";

import {
  VALUE_BUCKETS,
  type AttentionItem,
  type DraftItem,
  type RecallVerdict,
  type ReviewVerdict,
  type TriageItem,
  type ValueBucket,
} from "./types";

const RECALL_VERDICTS: readonly RecallVerdict[] = ["original_correct", "challenge_correct", "inconclusive"];
const REVIEW_VERDICTS: readonly ReviewVerdict[] = ["approve", "revise", "reject"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function attentionSurfaceRow(item: AttentionItem) {
  const a = item.audit;
  return {
    kind: item.kind,
    id: item.id,
    asset_id: item.assetId,
    organization_id: item.organizationId,
    title: item.title,
    detail: item.detail,
    created_at: item.createdAt,
    ...(a
      ? {
          original: { bucket: a.original_bucket, confidence: a.original_confidence },
          challenger: {
            bucket: a.challenge_bucket,
            confidence: a.challenge_confidence,
            reasoning: a.challenge_reasoning,
            value_estimate: a.challenge_value_estimate,
          },
          value_delta: a.disagreement_value_delta,
          escalated_at: a.escalated_at,
        }
      : {}),
  };
}

export interface RecallVerdictPlan {
  item: AttentionItem;
  verdict: RecallVerdict;
}

/** record_verdicts: [{ id, verdict }] against the recall rows on screen. */
export function parseRecallVerdicts(value: unknown, items: readonly AttentionItem[]): RecallVerdictPlan[] {
  const target = "record_verdicts";
  const list = readCollectionList(target, "verdicts", value, 25);
  const recall = new Map(items.filter((i) => i.audit).map((i) => [i.id, i]));
  const idOf = (raw: unknown) => (isRecord(raw) && typeof raw.id === "string" ? raw.id : null);
  return collectProblems(
    target,
    list,
    (raw) => {
      const id = idOf(raw);
      const item = id ? recall.get(id) : undefined;
      if (!item) throw new ListLevelProblem(`${JSON.stringify(id)} is not a recall row on screen — use a recall id from attention_items.`);
      const verdict = (raw as Record<string, unknown>).verdict;
      if (!RECALL_VERDICTS.includes(verdict as RecallVerdict)) {
        throw new Error('"verdict" must be "original_correct", "challenge_correct" or "inconclusive".');
      }
      return { item, verdict: verdict as RecallVerdict };
    },
    { nameOf: idOf, listChecks: (checked) => [repeatsProblem(target, checked.map((c) => idOf(c.raw)), "id")] },
  );
}

export function triageSurfaceItem(item: TriageItem) {
  return {
    asset_id: item.assetId,
    organization_id: item.organizationId,
    pipeline_state: item.pipelineState,
    notes: item.notes,
    is_gem_candidate: item.isGemCandidate,
    estimated_value: item.estimatedValue,
    estimated_value_currency: item.estimatedValueCurrency,
    ai_bucket: item.aiBucket,
    ai_confidence: item.aiConfidence,
    ai_reasoning: item.aiReasoning,
    photo_count: item.photoFileIds.length,
    created_at: item.createdAt,
  };
}

/** value_bucket: one bucket word for the asset in view. */
export function readValueBucket(value: unknown): ValueBucket {
  const bucket = typeof value === "string" ? value.trim() : value;
  if (!VALUE_BUCKETS.includes(bucket as ValueBucket)) {
    throw new Error(`value_bucket must be one of ${VALUE_BUCKETS.map((b) => `"${b}"`).join(", ")}.`);
  }
  return bucket as ValueBucket;
}

/** The draft's fields as the person sees them now (edits applied). */
export function draftSurfaceFields(item: DraftItem, edits: Record<string, string>) {
  return item.fields.map((f) => ({
    path: f.path,
    label: f.label,
    value: edits[f.path] ?? f.value,
    ai_value: f.value,
    edited: f.path in edits && edits[f.path] !== f.value,
  }));
}

/** draft_field_edits: { path: value } over the draft's own field paths. */
export function readDraftFieldEdits(item: DraftItem, value: unknown): Record<string, string> {
  const problems = new ProblemList("draft_field_edits");
  if (!isRecord(value)) throw new Error('draft_field_edits: send an object like { "title": "…", "price": "24.99" }.');
  const paths = new Set(item.fields.map((f) => f.path));
  const out: Record<string, string> = {};
  for (const [path, v] of Object.entries(value)) {
    if (!paths.has(path)) problems.add(`Unknown field "${path}" — use a path from draft_fields.`);
    else if (typeof v !== "string") problems.add(`The value for "${path}" must be text.`);
    else out[path] = v;
  }
  problems.throwIfAny();
  return out;
}

export function readReviewVerdict(value: unknown): ReviewVerdict {
  const verdict = typeof value === "string" ? value.trim() : value;
  if (!REVIEW_VERDICTS.includes(verdict as ReviewVerdict)) {
    throw new Error('review_verdict must be "approve", "revise" or "reject".');
  }
  return verdict as ReviewVerdict;
}
