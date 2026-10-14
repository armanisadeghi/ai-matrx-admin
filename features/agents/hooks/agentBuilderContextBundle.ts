/**
 * The two XML bundles the Agent Builder's helper reads in full every turn
 * (`matrx-user/agent-builder` values `agent_builder_definition` and
 * `agent_builder_test_panel`; Arman 2026-10-13).
 *
 * Why bundles: a surface value over its inline limit reaches the model as a
 * pointer it must fetch (all-or-nothing, `context_objects.should_inline`), and
 * a value marked bindable-only never reaches it at all — so the helper saw a
 * 200-char slice of the system prompt and none of the message templates. Each
 * bundle is built here, clipped piece by piece, and kept under its manifest
 * `inlineUpTo` so it always arrives whole.
 *
 * Message text is written VERBATIM (unescaped) so the helper can quote it in a
 * `str_replace` edit; everything else goes through the shared XML helpers.
 *
 * <next_send> vs <last_run>: the test panel keeps the finished run on screen
 * (`conversationFocus.display`) while the composer is bound to a fresh one
 * (`input`). The run is history; the next send is what Send submits now.
 */

import {
  clipText,
  escapeXml,
  xmlAttrs,
  xmlElement,
  xmlList,
  xmlText,
} from "@ai-matrx/chat/surfaces/runtime/context-bundle";
import { selectModelById } from "@ai-matrx/agents/models";
import { selectToolById } from "@ai-matrx/agents/tools";
import { readModelRecords } from "@ai-matrx/chat/agents/identity/model-catalog";
import { getToolCatalog } from "@ai-matrx/chat/agents/identity/tool-catalog";
import { readAgentDescription, readAgentName } from "@ai-matrx/chat/agents/identity/agent-identity";
import { selectAgentById, selectAgentDirtyFields } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import {
  selectInstanceVariableDefinitions,
  selectVariableProvenance,
  selectVariablesTheRunUsed,
  selectVariablesForRequest,
  selectMissingRequiredVariables,
} from "@ai-matrx/chat/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors";
import { selectInstanceResources } from "@ai-matrx/chat/agents/redux/execution-system/instance-resources/instance-resources.selectors";
import { selectUserInputText } from "@ai-matrx/chat/agents/redux/execution-system/instance-user-input/instance-user-input.selectors";
import {
  extractFlatText,
  selectConversationMessages,
} from "@ai-matrx/chat/agents/redux/execution-system/messages/messages.selectors";
import {
  addUsageTotals,
  getUserRequestResult,
  makeSelectConversationRequests,
  requestTtftMs,
  type MutableTotals,
} from "@ai-matrx/chat/agents/components/run-controls/panels/shared";
import type { AgentDefinition, VariableDefinition } from "@ai-matrx/chat/agents/types/agent-definition.types";
import type { ChatRootState } from "@ai-matrx/chat/store/root-state";
import { usdToPoints } from "@ai-matrx/kit/format";
import { currentPointsRate } from "@/components/cost/pointsRate";
import { isAssociationsRpcErr } from "@ai-matrx/associations";
import { isSyntheticAgentId } from "@ai-matrx/chat/agents/redux/agent-definition/synthetic-id";
import { associationsService } from "@/features/scopes/service/associationsService";
import { AGENT_RESOURCE_ROLE } from "@/features/agents/components/builder/agentResourceRole";
import { TERM_LIST_ROLE, TERM_LIST_TOKEN } from "@/features/agents/term-lists/types";
import { fetchLatestFeedback } from "@/features/agents/run-review/responseFeedbackService";
import { agentBuilderTestSurfaceKey } from "./agentBuilderTestRun";

/** Kept in step with the manifest's `inlineUpTo` for each value (a bundle over it arrives as a pointer). */
export const DEFINITION_BUNDLE_MAX = 45_000;
export const TEST_PANEL_BUNDLE_MAX = 30_000;

/** Attachments the builder reads from associations, not the agent record. */
export interface AgentAttachments {
  resources: { type: string; id: string; label: string | null }[];
  termLists: { id: string; label: string | null }[];
  /** Set when the read failed — the bundle says so instead of claiming "none". */
  error?: string;
}

/** The person's rating of the last run (agent.cmp_response_feedback). */
export interface RunRating {
  /** Set when the rating could not be read — said, never shown as "not rated". */
  error?: string;
  rating: "up" | "down" | null;
  overall: number | null;
  scores: Record<string, number>;
  comment: string | null;
}

/** Per-piece clip sizes; halved and retried when a bundle runs over its ceiling. */
interface Limits {
  message: number;
  json: number;
  value: number;
  answer: number;
  turn: number;
}
const GENEROUS: Limits = { message: 20_000, json: 6_000, value: 4_000, answer: 12_000, turn: 3_000 };

function halve(l: Limits): Limits {
  return {
    message: Math.floor(l.message / 2),
    json: Math.floor(l.json / 2),
    value: Math.floor(l.value / 2),
    answer: Math.floor(l.answer / 2),
    turn: Math.floor(l.turn / 2),
  };
}

/** Build with generous clips; shrink until the bundle fits its ceiling. */
function fitted(build: (l: Limits) => string, max: number): string {
  let limits = GENEROUS;
  for (let i = 0; i < 6; i++) {
    const out = build(limits);
    if (out.length <= max) return out;
    limits = halve(limits);
  }
  // Still over after six halvings: the lists themselves are huge. Never cut
  // mid-tag — send a well-formed stub that says where the whole thing is.
  return `<bundle_too_large total_chars="${build(limits).length}">This part is larger than its ${max}-char ceiling. Call agent_builder_read_definition (definition) or agent_builder_read_test_value (test panel) for it.</bundle_too_large>`;
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** A JSON blob as escaped text, clipped with the standard clipped marker. */
function jsonElement(tag: string, value: unknown, max: number, attrs: Record<string, string | number | boolean | null | undefined> = {}): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && Object.keys(value as object).length === 0) return "";
  return xmlText(tag, stringify(value), { max, attrs });
}

/** Text written verbatim (never escaped) so it can be quoted exactly in an edit. */
function verbatim(tag: string, attrs: Record<string, string | number | boolean | null | undefined>, text: string, max: number): string {
  const { text: body, clipped, totalChars } = clipText(text, max);
  const a = xmlAttrs({ ...attrs, ...(clipped ? { clipped: true, total_chars: totalChars } : {}) });
  return `<${tag}${a}>${body}</${tag}>`;
}

function blockText(block: unknown): string | null {
  if (!block || typeof block !== "object") return null;
  const b = block as { type?: string; text?: string };
  return b.type === "text" && typeof b.text === "string" ? b.text : null;
}

function renderMessages(agent: AgentDefinition, l: Limits): string {
  const messages = agent.messages ?? [];
  const rows = messages.map((m, index) => {
    const blocks = Array.isArray(m.content) ? m.content : [];
    const text = blocks.map(blockText).filter((t): t is string => t !== null).join("\n");
    const other = blocks
      .filter((b) => blockText(b) === null)
      .map((b) => xmlElement("block", { type: (b as { type?: string })?.type ?? "unknown" }))
      .join("");
    const attrs = { index, role: m.role };
    return text || !other ? verbatim("message", attrs, text, l.message) + other : xmlElement("message", attrs, other);
  });
  if (rows.length === 0) return `<messages count="0">No message templates, not even a system message.</messages>`;
  return `<messages count="${rows.length}" note="text inside each message is verbatim; index 0 is the system message">\n${rows.join("\n")}\n</messages>`;
}

function renderVariables(defs: VariableDefinition[] | null, l: Limits): string {
  if (!defs || defs.length === 0) return `<variables count="0">No variables.</variables>`;
  return xmlList("variables", defs, (v) =>
    xmlElement(
      "variable",
      {
        name: v.name,
        label: v.label,
        required: v.required ? true : undefined,
        default: v.defaultValue === undefined || v.defaultValue === null || v.defaultValue === "" ? undefined : clipText(stringify(v.defaultValue), l.value).text,
      },
      [
        xmlText("help", v.helpText ?? null, { max: l.value }),
        jsonElement("component", v.customComponent, l.json),
        jsonElement("binding", v.binding, l.json),
        jsonElement("control", v.control, l.json),
      ],
    ),
  );
}

function renderTools(agent: AgentDefinition, l: Limits): string {
  const catalog = getToolCatalog().getState();
  const tools = agent.tools ?? [];
  const saved = tools.length
    ? tools
        .slice(0, 150)
        .map((id) => xmlElement("tool", { id, name: selectToolById(catalog, id)?.name ?? "(name not loaded)" }))
        .join("\n") + (tools.length > 150 ? `\n<more count="${tools.length - 150}"/>` : "")
    : `<none>NO TOOLS — this agent has no saved tools.</none>`;
  const custom = (agent.customTools ?? []).length
    ? xmlList("custom_tools", agent.customTools, (t) => jsonElement("custom_tool", t, l.json), { maxRows: 40 })
    : "";
  const mcp = (agent.mcpServers ?? []).length
    ? xmlList("mcp_servers", agent.mcpServers, (id) => xmlElement("mcp_server", { id }), { maxRows: 60 })
    : "";
  return `<tools count="${tools.length}" automatic_injection="${agent.autoToolsDisabled ? "off" : "on"}" note="${
    agent.autoToolsDisabled
      ? "automatic tool injection is OFF: the agent gets only these saved tools"
      : "automatic tool injection is ON: the platform may add tools beside these"
  }">\n${[saved, custom, mcp].filter(Boolean).join("\n")}\n</tools>`;
}

function renderContextPolicies(agent: AgentDefinition, l: Limits): string {
  const policies = agent.contextPolicies ?? [];
  const body = policies.length
    ? policies.map((p) => jsonElement("policy", p, l.json, { key: p.key })).join("\n")
    : `<none>No context policies declared.</none>`;
  return `<context_policies count="${policies.length}" automatic_context="${agent.autoContextDisabled ? "off" : "on"}" note="${
    agent.autoContextDisabled
      ? "automatic context is OFF: only these declared policies deliver"
      : "automatic context is ON: declared policies govern their keys and other context still flows"
  }">\n${body}\n</context_policies>`;
}

function renderAttachments(att: AgentAttachments | null): string {
  if (!att) return "";
  if (att.error) return xmlText("attachments_unavailable", att.error);
  const resources = att.resources.length
    ? xmlList("resources", att.resources, (r) => xmlElement("resource", { type: r.type, id: r.id, label: r.label }), { maxRows: 100 })
    : `<resources count="0"/>`;
  const terms = att.termLists.length
    ? xmlList("term_lists", att.termLists, (t) => xmlElement("term_list", { id: t.id, label: t.label }), { maxRows: 100 })
    : `<term_lists count="0"/>`;
  return `${resources}\n${terms}`;
}

/** The whole agent being built, as the `<agent>` bundle. Null when it has not loaded. */
export function buildAgentDefinitionBundle(
  state: ChatRootState,
  agentId: string,
  attachments: AgentAttachments | null,
): string | null {
  const agent = selectAgentById(state, agentId);
  if (!agent) return null;
  const dirty = Object.keys(selectAgentDirtyFields(state, agentId) ?? {});
  const model = selectModelById(readModelRecords(), agent.modelId);
  return fitted(
    (l) =>
      [
        `<agent${xmlAttrs({
          id: agent.isVersion ? agent.parentAgentId : agent.id,
          version_record_id: agent.isVersion ? agent.id : undefined,
          name: readAgentName(state, agentId) ?? agent.name,
          version: agent.version,
          is_version_snapshot: agent.isVersion || undefined,
          unsaved_changes: dirty.length > 0,
          unsaved_fields: dirty.join(", ") || undefined,
          read_only: agent.isVersion || agent.accessLevel === "viewer" || agent.accessLevel === "public" ? true : undefined,
          access: agent.accessLevel,
        })}>`,
        xmlText("description", readAgentDescription(state, agentId) ?? agent.description, { max: l.value }),
        xmlElement("identity", {
          type: agent.agentType,
          category: agent.category,
          tags: (agent.tags ?? []).join(", "),
          active: agent.isActive,
          archived: agent.isArchived || undefined,
          forked_from: agent.sourceAgentId,
          input_kind: agent.inputKind,
        }),
        agent.modelId
          ? xmlElement("model", {
              id: agent.modelId,
              name: model?.common_name ?? model?.name ?? "(not loaded)",
              api_name: model?.name,
              provider: model?.maker,
              context_window: model?.context_window,
            })
          : `<model>NO MODEL SELECTED</model>`,
        jsonElement("model_tiers", agent.modelTiers, l.json),
        jsonElement("settings", agent.settings, l.json) || `<settings>defaults</settings>`,
        renderMessages(agent, l),
        renderVariables(agent.variableDefinitions, l),
        renderTools(agent, l),
        renderContextPolicies(agent, l),
        jsonElement("skills", agent.skillConfig, l.json),
        agent.outputSchema
          ? jsonElement("output_schema", agent.outputSchema, l.json * 2)
          : `<output_schema>none — the agent answers in free text</output_schema>`,
        (agent.promptBlocks ?? []).length
          ? xmlList("prompt_blocks", agent.promptBlocks, (b) => xmlElement("prompt_block", { name: b.name }))
          : "",
        jsonElement("matrx_actions", agent.matrxDirectives, l.json),
        renderAttachments(attachments),
        `</agent>`,
      ]
        .filter(Boolean)
        .join("\n"),
    DEFINITION_BUNDLE_MAX,
  );
}

function renderValues(
  tag: string,
  values: Record<string, unknown>,
  defs: VariableDefinition[],
  provenance: Record<string, string> | null,
  l: Limits,
): string {
  const names = defs.length ? defs.map((d) => d.name) : Object.keys(values);
  if (names.length === 0) return `<${tag} count="0"/>`;
  return xmlList(tag, names, (name) => {
    const value = values[name];
    const empty = value === undefined || value === null || value === "";
    return xmlText("variable", empty ? "(empty)" : stringify(value), {
      max: l.value,
      attrs: { name, source: provenance?.[name] },
    });
  });
}

/** The run's numbers, summed over every turn in the conversation; the last turn's status and id. */
function runUsage(state: ChatRootState, conversationId: string) {
  const requests = makeSelectConversationRequests(conversationId)(state);
  const last = requests[requests.length - 1];
  if (!last) return null;
  const totals: MutableTotals = { input: 0, output: 0, cached: 0, total: 0, cost: 0, requests: 0 };
  let measured = false;
  let serverSeconds = 0;
  for (const request of requests) {
    const result = getUserRequestResult(request);
    if (!result) continue;
    measured = true;
    addUsageTotals(totals, result.total_usage?.total);
    serverSeconds += result.timing_stats?.total_duration ?? 0;
  }
  const points = measured ? usdToPoints(totals.cost, { rate: currentPointsRate() }) : null;
  return {
    requestId: last.serverRequestId ?? last.requestId,
    attrs: {
      turns: requests.length,
      last_turn_status: last.status,
      last_request_id: last.serverRequestId ?? undefined,
      input_tokens: totals.input || undefined,
      cached_input_tokens: totals.cached || undefined,
      output_tokens: totals.output || undefined,
      total_tokens: totals.total || undefined,
      cost_points: points ?? undefined,
      last_turn_time_to_first_token_ms: requestTtftMs(last) ?? undefined,
      server_duration_ms: serverSeconds ? Math.round(serverSeconds * 1000) : undefined,
    },
  };
}

function hasTurns(state: ChatRootState, conversationId: string): boolean {
  return selectConversationMessages(conversationId)(state).some(
    (m) => m.role === "user" || m.role === "assistant",
  );
}

/** The conversation the last finished run lives in (the shown one first), or null. */
export function lastRunConversationId(state: ChatRootState, agentId: string): string | null {
  const focus = state.conversationFocus?.bySurface[agentBuilderTestSurfaceKey(agentId)];
  for (const id of [focus?.display, focus?.input]) {
    if (id && hasTurns(state, id)) return id;
  }
  return null;
}

/** The conversation the composer is bound to — what Send submits. */
export function nextSendConversationId(state: ChatRootState, agentId: string): string | null {
  return state.conversationFocus?.bySurface[agentBuilderTestSurfaceKey(agentId)]?.input ?? null;
}

/** The request id the last run's rating is filed under (`RunReviewCard`). */
export function lastRunRequestId(state: ChatRootState, agentId: string): string | null {
  const id = lastRunConversationId(state, agentId);
  return id ? (runUsage(state, id)?.requestId ?? null) : null;
}

/** The test panel as the `<test_panel>` bundle. Null before the panel has a conversation. */
export function buildTestPanelBundle(
  state: ChatRootState,
  agentId: string,
  rating: RunRating | null,
): string | null {
  const nextId = nextSendConversationId(state, agentId);
  const lastId = lastRunConversationId(state, agentId);
  if (!nextId && !lastId) return `<test_panel>Not started — the test panel has no conversation yet.</test_panel>`;

  return fitted((l) => {
    const parts: string[] = [];
    if (nextId) {
      const defs = selectInstanceVariableDefinitions(nextId)(state);
      const values = selectVariablesForRequest(nextId)(state);
      const missing = selectMissingRequiredVariables(nextId)(state);
      const typed = selectUserInputText(nextId)(state);
      parts.push(
        xmlElement(
          "next_send",
          {
            conversation_id: nextId,
            same_conversation_as_last_run: nextId === lastId || undefined,
            missing_required: missing.join(", ") || undefined,
            note: "what pressing Send submits now; change it with test_variable_values / test_user_input",
          },
          [
            renderValues("variables", values, defs, selectVariableProvenance(nextId)(state), l),
            typed.trim() ? verbatim("typed_text", {}, typed, l.answer) : `<typed_text>(empty)</typed_text>`,
            xmlList(
              "attachments",
              selectInstanceResources(nextId)(state),
              (r) => xmlElement("attachment", { id: r.resourceId, type: r.blockType, status: r.status }),
              { maxRows: 50 },
            ),
          ],
        ),
      );
    }
    if (lastId) {
      const transcript = selectConversationMessages(lastId)(state)
        .filter((m) => m.isVisibleToUser !== false && (m.role === "user" || m.role === "assistant"))
        .map((m) => ({ role: m.role, text: extractFlatText(m).trim() }))
        .filter((m) => m.text !== "");
      const lastAnswerIndex = transcript.map((m) => m.role).lastIndexOf("assistant");
      const usage = runUsage(state, lastId);
      const ran = selectVariablesTheRunUsed(lastId)(state);
      const turns = transcript.map((m, i) =>
        verbatim("turn", { index: i, role: m.role }, m.text, i === lastAnswerIndex ? l.answer : l.turn),
      );
      parts.push(
        xmlElement(
          "last_run",
          {
            conversation_id: lastId,
            note: "the run that already happened — history, not what the next send carries",
          },
          [
            usage ? xmlElement("usage", usage.attrs) : "",
            rating?.error
              ? xmlText("rating_unavailable", rating.error)
              : rating
              ? xmlElement(
                  "rating",
                  {
                    thumbs: rating.rating,
                    overall_of_5: rating.overall,
                    scores: Object.entries(rating.scores)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(", "),
                  },
                  rating.comment ? escapeXml(rating.comment) : null,
                )
              : `<rating>not rated</rating>`,
            Object.keys(ran).length ? renderValues("variables_sent", ran, [], null, l) : "",
            transcript.length
              ? `<transcript turns="${transcript.length}">\n${turns.join("\n")}\n</transcript>`
              : "",
          ],
        ),
      );
    } else {
      parts.push(`<last_run>No run yet in this panel.</last_run>`);
    }
    return `<test_panel>\n${parts.join("\n")}\n</test_panel>`;
  }, TEST_PANEL_BUNDLE_MAX);
}

/** Resources and term lists attached to the agent — one associations read, both rows the builder shows. */
export async function readAgentAttachments(agentId: string): Promise<AgentAttachments | null> {
  if (isSyntheticAgentId(agentId)) return null;
  const result = await associationsService.listForTargetsVisible("agent", [agentId]);
  if (isAssociationsRpcErr(result)) {
    return { resources: [], termLists: [], error: `Could not read attachments: ${result.error.message}` };
  }
  const edges = result.data.edges;
  return {
    resources: edges
      .filter((e) => e.role === AGENT_RESOURCE_ROLE)
      .map((e) => ({ type: e.sourceType, id: e.sourceId, label: e.label })),
    termLists: edges
      .filter((e) => e.role === TERM_LIST_ROLE && e.sourceType === TERM_LIST_TOKEN)
      .map((e) => ({ id: e.sourceId, label: e.label })),
  };
}

/** The person's rating of the last run, filed under its request id (`RunReviewCard`). */
export async function readLastRunRating(
  state: ChatRootState,
  agentId: string,
  userId: string | null,
): Promise<RunRating | null> {
  const conversationId = lastRunConversationId(state, agentId);
  const requestId = lastRunRequestId(state, agentId);
  if (!conversationId || !requestId) return null;
  if (!userId) {
    return { error: "Signed-in person unknown, so the rating could not be read.", rating: null, overall: null, scores: {}, comment: null };
  }
  const rows = await fetchLatestFeedback(userId, conversationId);
  const row = rows.find((r) => r.request_id === requestId);
  if (!row) return null;
  const scores = (row.metadata?.scores ?? {}) as Record<string, number>;
  return { rating: row.rating, overall: row.overall, scores, comment: row.comment };
}
