/**
 * Decision review — data access.
 *
 * Reads AND labels go straight to Supabase as the signed-in person: reads
 * under RLS (`std_select` on platform.judge_verdict and the caller's own chat
 * rows), labels through `platform.label_decision_item` /
 * `platform.label_decision_conversations` — gated to members of the item's
 * organization, normalized by the ONE vocabulary
 * (`platform.normalize_decision_label`), so the queue and the battle verdict
 * column land identically. Two things go to the server: calibration (computed
 * by `matrx_ai.evaluators.calibration` — kappa, reliability curve, Brier) and
 * reference runs (a model call per answer, priced first). Reference rows are
 * read straight from the table like the items.
 * aidream `aidream/services/decision_review/FEATURE.md`.
 */

import { createClient } from "@/utils/supabase/client";
import { readAllRows } from "@ai-matrx/data/db";
import { callApi } from "@/lib/api/call-api";
import { isJsonObject } from "@/types/json";
import type { AppDispatch } from "@/lib/redux/store";
import type { components } from "@ai-matrx/api/types";
import { IN_MY_ORGANIZATIONS } from "@/features/organizations/service/inMyOrganizations";
import {
  DECISION_SUBJECT_KIND,
  decisionJudgeKey,
  orderQueue,
  readReviewItem,
  type DecisionSource,
  type JudgeVerdictRow,
  type ReviewItem,
} from "./queue";
import { readInChunks } from "@/features/scopes/service/inChunks";
import { openStream, type ApiStream, type NdjsonEvent, type OperationDescriptor } from "@ai-matrx/api";
import { serverApi } from "@/lib/api/server-api";
import {
  REFERENCE_SUBJECT_KIND,
  latestPerItem,
  readReferenceQuote,
  readReferenceVerdictRow,
  type ReferenceQuote,
  type ReferenceVerdict,
  type ReferenceVerdictRow,
} from "./reference";

export type DecisionCalibrationReport =
  components["schemas"]["DecisionCalibrationReport"];
export type GroupCalibration = components["schemas"]["GroupCalibration"];

/** One saved label, as `platform.label_decision_item` returns it. */
export interface LabeledItem {
  id: string;
  question: string;
  verdict: string;
  authority_verdict: string;
  agreed: boolean;
}

/** The battle verdict column's write: what was labeled, and why each other column was not. */
export interface ConversationLabels {
  labeled: LabeledItem[];
  /** conversation id -> why nothing was labeled there */
  skipped: Record<string, string>;
}

function readLabeledItem(value: unknown): LabeledItem {
  if (
    !isJsonObject(value) ||
    typeof value.id !== "string" ||
    typeof value.question !== "string" ||
    typeof value.verdict !== "string" ||
    typeof value.authority_verdict !== "string" ||
    typeof value.agreed !== "boolean"
  ) {
    throw new Error("The label was saved, but the database answered in an unexpected shape.");
  }
  return {
    id: value.id,
    question: value.question,
    verdict: value.verdict,
    authority_verdict: value.authority_verdict,
    agreed: value.agreed,
  };
}

const ITEM_COLUMNS =
  "id, judge_key, organization_id, question, judge_version, model, verdict, confidence, authority_verdict, agreed, subject_ref_id, created_at, metadata";

/** Everything the queue can show for one agent, capped by the knob-free page size. */
export const QUEUE_PAGE_SIZE = 500;

/**
 * Which items a queue reads. One agent's answers (`/agents/<id>/answers`), or
 * every decision item in the organizations the person belongs to
 * (`/decisions/review`) — declared here, never left to RLS alone, because a
 * platform admin's RLS reads every organization's rows and this is a person's
 * page, not the admin system.
 */
export type QueueScope = { agentId: string } | { agentId: null };

export interface QueueFilters {
  status: "unlabeled" | "labeled" | "all";
  /** Combined queue only: agent / workflow step / API model. */
  source: DecisionSource | null;
  question: string | null;
  method: string | null;
  model: string | null;
  version: number | null;
}

export const DEFAULT_FILTERS: QueueFilters = {
  status: "unlabeled",
  source: null,
  question: null,
  method: null,
  model: null,
  version: null,
};

export async function loadQueue(
  scope: QueueScope,
  filters: QueueFilters,
): Promise<ReviewItem[]> {
  const client = createClient();
  // The combined queue = verdicts in ANY of her organizations, asked on the server
  // (`in_my_organizations`) — never an id list built from the first page of her organizations.
  const answers = await Promise.all(
    [scope.agentId ?? null].map((agentId) => {
      const base = client
        .schema("platform")
        .from("judge_verdict")
        .select(ITEM_COLUMNS)
        .eq("subject_kind", DECISION_SUBJECT_KIND)
        .is("deleted_at", null);
      let query = agentId !== null
        ? base.eq("judge_key", decisionJudgeKey(agentId))
        : base.is(IN_MY_ORGANIZATIONS, true);
      if (filters.source === "model") query = query.like("judge_key", "model:%");
      if (filters.source === "workflow") {
        query = query.or("judge_key.like.workflow_node:*,metadata->>workflow_run_id.not.is.null");
      }
      if (filters.source === "agent") {
        query = query.like("judge_key", "agent:%").is("metadata->>workflow_run_id", null);
      }
      if (filters.status === "unlabeled") query = query.is("authority_verdict", null);
      if (filters.status === "labeled") query = query.not("authority_verdict", "is", null);
      if (filters.question) query = query.eq("question", filters.question);
      if (filters.model) query = query.eq("model", filters.model);
      if (filters.version != null) query = query.eq("judge_version", filters.version);
      if (filters.method) query = query.eq("metadata->>method", filters.method);
      return query
        .order("confidence", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: false })
        .limit(QUEUE_PAGE_SIZE);
    }),
  );
  const failed = answers.find((a) => a.error);
  if (failed?.error) throw failed.error;
  const data = answers.flatMap((a) => a.data ?? []);
  return orderQueue((data as JudgeVerdictRow[]).map(readReviewItem));
}

export interface QueueFacets {
  questions: string[];
  models: string[];
  methods: string[];
  versions: number[];
  /** Agent version number → its `agent_version_id` (the reference run samples by id). */
  versionIds: Record<number, string>;
  total: number;
  labeled: number;
}

/** Every value each filter can take, and the labeled/total counts. */
export async function loadFacets(scope: QueueScope): Promise<QueueFacets> {
  const client = createClient();
  const rows = (
    await Promise.all(
      [scope.agentId ?? null].map((agentId) =>
        readAllRows(
          ({ from, to }) => {
            const base = client
              .schema("platform")
              .from("judge_verdict")
              .select("id, question, model, judge_version, authority_verdict, metadata", {
                count: "exact",
              });
            const scoped = agentId !== null
              ? base.eq("judge_key", decisionJudgeKey(agentId))
              : base.is(IN_MY_ORGANIZATIONS, true);
            return scoped
              .eq("subject_kind", DECISION_SUBJECT_KIND)
              .is("deleted_at", null)
              .order("id", { ascending: true })
              .range(from, to);
          },
          { label: "platform.judge_verdict (decision answers)" },
        ),
      ),
    )
  ).flat();
  const questions = new Set<string>();
  const models = new Set<string>();
  const methods = new Set<string>();
  const versions = new Set<number>();
  const versionIds: Record<number, string> = {};
  let labeled = 0;
  for (const row of rows) {
    questions.add(row.question);
    if (row.model) models.add(row.model);
    const method = isJsonObject(row.metadata) ? row.metadata.method : null;
    if (typeof method === "string") methods.add(method);
    versions.add(row.judge_version);
    const versionId = isJsonObject(row.metadata) ? row.metadata.agent_version_id : null;
    if (typeof versionId === "string" && !versionIds[row.judge_version]) {
      versionIds[row.judge_version] = versionId;
    }
    if (row.authority_verdict) labeled += 1;
  }
  return {
    questions: [...questions].sort(),
    models: [...models].sort(),
    methods: [...methods].sort(),
    versions: [...versions].sort((a, b) => b - a),
    versionIds,
    total: rows.length,
    labeled,
  };
}

export interface JudgedState {
  /** The text the model judged, part by part. */
  parts: string[];
  /** False when the conversation is not readable by this viewer. */
  visible: boolean;
}

const TRANSLATOR_PREAMBLE = "You are answering a fixed set of decision questions";

/**
 * The state the model judged: the text parts of the user turn that asked the
 * questions. The verbalized route persists its own instruction block beside
 * the state; that block is the translator's wording, not the state, so it is
 * left out.
 */
export async function loadJudgedState(
  item: Pick<ReviewItem, "messageId" | "conversationId">,
): Promise<JudgedState> {
  if (!item.messageId || !item.conversationId) return { parts: [], visible: false };
  const client = createClient().schema("chat");
  const { data: answer, error: answerError } = await client
    .from("message")
    .select("position")
    .eq("id", item.messageId)
    .maybeSingle();
  if (answerError) throw answerError;
  if (!answer) return { parts: [], visible: false };
  const { data: turn, error } = await client
    .from("message")
    .select("content")
    .eq("conversation_id", item.conversationId)
    .eq("role", "user")
    .is("deleted_at", null)
    .lt("position", answer.position)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!turn) return { parts: [], visible: true };
  const content = turn.content;
  return { parts: textParts(content), visible: true };
}

/** Record the person's true answer on one item, as them (RLS + the RPC's org-member gate). */
export async function labelItem(
  item: Pick<ReviewItem, "id">,
  answer: string,
): Promise<LabeledItem> {
  const { data, error } = await createClient()
    .schema("platform")
    .rpc("label_decision_item", { p_item_id: item.id, p_answer: answer });
  // access-errors: ok — the RPC raises its own sentences (P0002 not yours, 22023 names the options)
  if (error) throw new Error(error.message);
  return readLabeledItem(data);
}

/** The battle verdict column: one true answer across every column's latest answer. */
export async function labelConversations(
  conversationIds: string[],
  question: string,
  answer: string,
): Promise<ConversationLabels> {
  const { data, error } = await createClient()
    .schema("platform")
    .rpc("label_decision_conversations", {
      p_conversation_ids: conversationIds,
      p_question: question,
      p_answer: answer,
    });
  // access-errors: ok — the RPC raises its own sentences (not a member, not an answer)
  if (error) throw new Error(error.message);
  const labeled = isJsonObject(data) && Array.isArray(data.labeled) ? data.labeled : [];
  const skippedRaw = isJsonObject(data) && isJsonObject(data.skipped) ? data.skipped : {};
  const skipped: Record<string, string> = {};
  for (const [conversationId, reason] of Object.entries(skippedRaw)) {
    skipped[conversationId] = typeof reason === "string" ? reason : "not labeled";
  }
  return { labeled: labeled.map(readLabeledItem), skipped };
}

/**
 * Calibration is a READ about this agent: it carries the viewer's active
 * organization like every call (`ensureOrgId(null)` inside callApi), never
 * the agent's — a super admin who is not a member of the agent's organization
 * was refused "You are not a member of that organization" when the agent's
 * organization rode `X-Organization-Id`.
 */
export async function loadCalibration(
  dispatch: AppDispatch,
  agentId: string,
  filters: { model?: string | null; method?: string | null },
): Promise<DecisionCalibrationReport> {
  const queryParams: Record<string, string> = {};
  if (filters.model) queryParams.model = filters.model;
  if (filters.method) queryParams.method = filters.method;
  const result = await dispatch(
    callApi({
      path: "/decision-review/agents/{agent_id}/calibration",
      method: "GET",
      pathParams: { agent_id: agentId },
      queryParams,
    }),
  );
  if (result.error) throw new Error(result.error.message);
  return result.data as DecisionCalibrationReport;
}

// ── Reference check ──────────────────────────────────────────────────────────

/**
 * The reference-run door. Hand-declared until `@ai-matrx/api` publishes the
 * generated operation (aidream `aidream/api/routers/decision_review.py`); it
 * rides the ONE client (`serverApi`), so auth, base URL, request id and the
 * viewer's active organization are the package's, not this file's.
 */
const REFERENCE_RUN_QUOTE_OP: OperationDescriptor = {
  m: "POST",
  p: "/decision-review/agents/{agent_id}/reference-runs",
  d: "aidream",
  a: "user",
  o: "required",
  n: "intelligence.quote_decision_reference_run",
};
const REFERENCE_RUN_OP: OperationDescriptor = {
  ...REFERENCE_RUN_QUOTE_OP,
  s: "ndjson",
  n: "intelligence.create_decision_reference_run",
};

export interface ReferenceSample {
  n: number;
  question?: string | null;
  agent_version_id?: string | null;
  model?: string | null;
  only_unlabeled?: boolean;
  only_without_reference?: boolean;
}

export interface ReferenceRunRequest {
  item_ids?: string[];
  sample?: ReferenceSample;
  /** Re-ask answers already checked (a failure or refusal is a stored check). */
  rerun?: boolean;
}

function referenceBody(request: ReferenceRunRequest, quoteOnly: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (request.item_ids && request.item_ids.length > 0) body.item_ids = request.item_ids;
  else if (request.sample) {
    const sample: Record<string, unknown> = { n: request.sample.n };
    if (request.sample.question) sample.question = request.sample.question;
    if (request.sample.agent_version_id) sample.agent_version_id = request.sample.agent_version_id;
    if (request.sample.model) sample.model = request.sample.model;
    // Both flags always travel: the server defaults only_without_reference to true.
    sample.only_unlabeled = request.sample.only_unlabeled ?? false;
    sample.only_without_reference = request.sample.only_without_reference ?? true;
    body.sample = sample;
  }
  if (request.rerun) body.rerun = true;
  if (quoteOnly) body.quote_only = true;
  return body;
}

/** What a run would check and cost. Spends nothing. */
export async function quoteReferenceRun(
  agentId: string,
  request: ReferenceRunRequest,
): Promise<ReferenceQuote> {
  const data = await serverApi.call<unknown>(REFERENCE_RUN_QUOTE_OP, {
    path: { agent_id: agentId },
    body: referenceBody(request, true),
  });
  return readReferenceQuote(data);
}

/** Start a run. The stream's `requestId` is the runtime operation id a rejoin follows. */
export async function openReferenceRun(
  agentId: string,
  request: ReferenceRunRequest,
  signal?: AbortSignal,
): Promise<ApiStream<NdjsonEvent>> {
  return openStream<NdjsonEvent>(
    serverApi,
    REFERENCE_RUN_OP,
    { path: { agent_id: agentId }, body: referenceBody(request, false) },
    { ...(signal ? { signal } : {}), totalTimeoutMs: null },
  );
}

/** Decision items by id, read as the person (RLS). */
export async function loadItemsByIds(ids: string[]): Promise<ReviewItem[]> {
  const client = createClient();
  const answer = await readInChunks<JudgeVerdictRow>(ids, (chunk) =>
    client
      .schema("platform")
      .from("judge_verdict")
      .select(ITEM_COLUMNS)
      .eq("subject_kind", DECISION_SUBJECT_KIND)
      .in("id", chunk)
      .returns<JudgeVerdictRow[]>(),
  );
  if (answer.error) throw new Error(answer.error.message);
  return (answer.data ?? []).map(readReviewItem);
}

/**
 * Every reference verdict on this agent's answers, newest per item. The
 * writer stamps `metadata.agent_id` on each row; complete (`readAllRows`),
 * because the table's set of checked items depends on it.
 */
export async function loadReferenceVerdicts(agentId: string): Promise<ReferenceVerdict[]> {
  const client = createClient();
  const rows = await readAllRows(
    ({ from, to }) =>
      client
        .schema("platform")
        .from("judge_verdict")
        .select("id, subject_ref_id, verdict, confidence, model, created_at, metadata", { count: "exact" })
        .eq("subject_kind", REFERENCE_SUBJECT_KIND)
        .contains("metadata", { agent_id: agentId })
        .is("deleted_at", null)
        .order("id", { ascending: true })
        .range(from, to),
    { label: "platform.judge_verdict (decision references)" },
  );
  const verdicts = (rows as ReferenceVerdictRow[]).flatMap((row) => {
    const v = readReferenceVerdictRow(row);
    return v ? [v] : [];
  });
  return [...latestPerItem(verdicts).values()];
}

function textParts(content: unknown): string[] {
  const list = Array.isArray(content) ? content : [];
  return list.flatMap((part) => {
    if (!isJsonObject(part)) return [];
    const text = part.text;
    if (typeof text !== "string" || !text.trim()) return [];
    if (text.trimStart().startsWith(TRANSLATOR_PREAMBLE)) return [];
    return [text];
  });
}

/**
 * The judged state of many items at once (item id → text parts): the user
 * turn just before each answer message. Unreadable conversations are absent.
 */
export async function loadJudgedStates(items: ReviewItem[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  const withMessage = items.filter((i) => i.messageId && i.conversationId);
  if (withMessage.length === 0) return out;
  const client = createClient().schema("chat");
  const answers = await readInChunks<{ id: string; position: number }>(
    withMessage.map((i) => i.messageId as string),
    (chunk) => client.from("message").select("id, position").in("id", chunk),
  );
  if (answers.error) throw new Error(answers.error.message);
  const position = new Map((answers.data ?? []).map((m) => [m.id, m.position]));
  const turns = await readInChunks<{ conversation_id: string; position: number; content: unknown }>(
    [...new Set(withMessage.map((i) => i.conversationId as string))],
    (chunk) =>
      client
        .from("message")
        .select("conversation_id, position, content")
        .in("conversation_id", chunk)
        .eq("role", "user")
        .is("deleted_at", null),
  );
  if (turns.error) throw new Error(turns.error.message);
  const byConversation = new Map<string, Array<{ position: number; content: unknown }>>();
  for (const t of turns.data ?? []) {
    const list = byConversation.get(t.conversation_id) ?? [];
    list.push(t);
    byConversation.set(t.conversation_id, list);
  }
  for (const item of withMessage) {
    const at = position.get(item.messageId as string);
    if (at == null) continue;
    const before = (byConversation.get(item.conversationId as string) ?? [])
      .filter((t) => t.position < at)
      .sort((a, b) => b.position - a.position)[0];
    out.set(item.id, before ? textParts(before.content) : []);
  }
  return out;
}

export function reviewAnswersHref(agentId: string): string {
  return `/agents/${agentId}/answers`;
}

/** Every decision item the person may see — agents, workflow steps and API model calls. */
export const ALL_DECISIONS_REVIEW_HREF = "/decisions/review";

export function calibrationHref(agentId: string): string {
  return `/agents/${agentId}/answers/calibration`;
}
