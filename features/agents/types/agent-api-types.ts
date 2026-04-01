// =============================================================================
// Structured input blocks — live data injection
// =============================================================================
//
// These blocks are resolved server-side before the message reaches the model.
// All share three control fields: convert_to_text, optional_context, keep_fresh.
//
// keep_fresh: when true, the resolved content is sent to the model for the
// current turn but stripped before the message is saved to the database.
// The block's structural definition (type + IDs + keep_fresh: true) IS saved,
// so the NEXT turn re-fetches fresh content automatically. Use for data that
// changes often (live tables, tasks in progress).

import type {
  TextBlock,
  ImageBlock,
  AudioBlock,
  VideoBlock,
  YouTubeVideoBlock,
  DocumentBlock,
  WebpageInputBlock,
  NotesInputBlock,
  TaskInputBlock,
  TableInputBlock,
  ListInputBlock,
  DataInputBlock,
  ContentBlock,
} from "./message-types";
import { ClientToolResult } from "./request.types";

/** Common fields on all structured input blocks. */
interface StructuredInputBase {
  /** Default true. Fetch result is injected as plain text. */
  convert_to_text?: boolean;
  /**
   * Default false.
   * When true: fetch/resolve failures silently drop this block instead of
   * aborting the request.
   */
  optional_context?: boolean;
  /**
   * Default false.
   * When true: resolved content is sent to the model but stripped from the
   * message before it is persisted to the database. The block definition
   * (type, IDs) is always saved. Re-fetched fresh on every subsequent turn.
   */
  keep_fresh?: boolean;
  /**
   * Default false.
   * When true: the CRUD/patch tools for this content type are automatically
   * injected into the agent's active tool list for the duration of the request.
   * The model can then read, update, and patch the item without the agent
   * definition needing to pre-configure those tools.
   *
   * Pairs naturally with keep_fresh — edits made by the model are immediately
   * visible on the next turn because the block is re-fetched fresh.
   *
   * Tool sets injected per type:
   *   input_notes  → note_get, note_list, note_create, note_update, note_patch, note_delete
   *   input_task   → task_get, task_list, task_create, task_update, task_delete
   *   input_table  → usertable_get_all/metadata/fields/data/search, usertable_add_rows,
   *                  usertable_update_row, usertable_delete_row, usertable_create_advanced
   *   input_list   → userlist_get_all, userlist_get_details, userlist_update_item,
   *                  userlist_batch_update, userlist_create, userlist_create_simple
   *   input_webpage → (none — external content is read-only)
   *   input_data   → (none — DB refs are read-only by default)
   */
  editable?: boolean;
}

// =============================================================================
// LLM parameter overrides
// =============================================================================

/**
 * LLM parameter overrides.
 *
 * Canonical frontend type — mirrors components['schemas']['LLMParams'] from
 * types/python-generated/api-types.ts. Keep in sync with that file and with
 * types/python-generated/llm-params.schema.json.
 *
 * All fields are optional. The backend treats null and absent identically —
 * both mean "use the agent's stored default". The frontend uses undefined
 * (not null) as the absent sentinel so that JSON.stringify omits the key.
 *
 * Run `pnpm update-api-types` after backend changes; TypeScript will flag
 * any drift against the generated schema.
 */
export interface LLMParams {
  /** Model UUID. When present, overrides the agent's stored modelId. */
  model?: string;

  // ── Sampling ────────────────────────────────────────────────────────────────
  /** Max tokens the model will generate. */
  max_output_tokens?: number;
  /** Randomness: 0 = deterministic, 2 = maximum. Provider ranges vary. */
  temperature?: number;
  /** Nucleus sampling: top probability mass to consider. */
  top_p?: number;
  /** Top-K sampling: limit next token to K candidates (integer). */
  top_k?: number;

  // ── Tool calling ────────────────────────────────────────────────────────────
  /** "none" | "auto" | "required" */
  tool_choice?: "none" | "auto" | "required";
  /** Allow the model to call multiple tools in a single turn. OpenAI only. */
  parallel_tool_calls?: boolean;

  // ── Reasoning / thinking ─────────────────────────────────────────────────
  /** OpenAI o-series reasoning effort. Also accepted by Cerebras. */
  reasoning_effort?:
    | "auto"
    | "none"
    | "minimal"
    | "low"
    | "medium"
    | "high"
    | "xhigh";
  /** OpenAI o-series reasoning summary verbosity. */
  reasoning_summary?: "concise" | "detailed" | "never" | "auto" | "always";
  /** Google Gemini 2.x thinking level (maps to thinking budget internally). */
  thinking_level?: "minimal" | "low" | "medium" | "high";
  /** Include the raw thinking text in the response. Anthropic + Google. */
  include_thoughts?: boolean;
  /** Token budget for extended reasoning. Anthropic + legacy Gemini. */
  thinking_budget?: number;
  /** Strip <thinking> blocks from the final response. Cerebras only. */
  clear_thinking?: boolean;
  /** Suppress reasoning entirely (maps to reasoning_effort="none"). Cerebras only. */
  disable_reasoning?: boolean;

  // ── Output control ───────────────────────────────────────────────────────
  /** Response format descriptor. { type: "json_object" } | { type: "json_schema", ... } */
  response_format?: Record<string, unknown>;
  /** Stop generation at these sequences. */
  stop_sequences?: string[];
  /** Stream tokens as they are generated. Default true for agent endpoints. */
  stream?: boolean;
  /** Persist the conversation to the DB. Default true. */
  store?: boolean;
  /** Verbosity hint for the model's response style. */
  verbosity?: string;

  // ── Provider-native features ─────────────────────────────────────────────
  /** Use the model's built-in web search tool. OpenAI / Google. */
  internal_web_search?: boolean;
  /** Let the model natively read URLs in context. Google only. */
  internal_url_context?: boolean;

  // ── Image generation ─────────────────────────────────────────────────────
  /** Image size string e.g. "1024x1024". Provider-specific. */
  size?: string;
  /** Quality preset e.g. "hd", "standard". Provider-specific. */
  quality?: string;
  /** Number of images to generate. */
  count?: number;

  // ── Audio / TTS ──────────────────────────────────────────────────────────
  /** Voice name (string) or multi-speaker config (array of {name, voice}). */
  tts_voice?: string | Array<Record<string, string>>;
  /** Output audio format e.g. "mp3", "wav". */
  audio_format?: string;

  // ── Video / diffusion generation ─────────────────────────────────────────
  /** Duration string e.g. "5". */
  seconds?: string;
  /** Frames per second (integer). */
  fps?: number;
  /** Diffusion steps (integer). Higher = better quality but slower. */
  steps?: number;
  /** Reproducibility seed (integer). */
  seed?: number;
  /** CFG / guidance scale (integer on backend). */
  guidance_scale?: number;
  /** Image quality score 0–100 (integer). */
  output_quality?: number;
  /** Negative prompt for diffusion models. */
  negative_prompt?: string;
  /** Output file format e.g. "png", "webp", "mp4". */
  output_format?: string;
  /** Output width in pixels (integer). */
  width?: number;
  /** Output height in pixels (integer). */
  height?: number;
  /** Reference frame images for video generation. */
  frame_images?: unknown[];
  /** Reference images for image generation. */
  reference_images?: unknown[];
  /** LoRA weights for image generation. */
  image_loras?: unknown[];
  /** Disable the model's built-in safety filter. */
  disable_safety_checker?: boolean;
}

// =============================================================================
// IDE state
// =============================================================================

export interface IdeFileState {
  path: string;
  content: string;
  language: string;
}

export interface IdeDiagnostic {
  message: string;
  severity: string; // "error" | "warning" | "information" | "hint"
  range: Record<string, unknown>;
  source?: string;
}

export interface IdeGitState {
  branch: string;
  status: string;
}

export interface IdeWorkspaceState {
  name: string;
  folders: string[];
}

/**
 * Structured snapshot of the user's IDE/editor state.
 *
 * All fields are optional. When present, each field expands into one or more
 * vsc_* variables that agents can reference in their prompts.
 * The vsc_get_state tool is auto-injected so the model can request state on demand.
 *
 * Variable reference:
 *   vsc_active_file_path      active_file.path
 *   vsc_active_file_content   active_file.content
 *   vsc_active_file_language  active_file.language
 *   vsc_selected_text         selected_text
 *   vsc_diagnostics           diagnostics (formatted string)
 *   vsc_workspace_name        workspace.name
 *   vsc_workspace_folders     workspace.folders (newline-joined)
 *   vsc_git_branch            git.branch
 *   vsc_git_status            git.status
 *   vsc_active_file_all       path + language + content combined
 *   vsc_editor                selected_text + diagnostics combined
 *   vsc_workspace_all         workspace name + folders combined
 *   vsc_git_all               branch + status combined
 *   vsc_all                   everything above combined
 */
export interface IdeState {
  active_file?: IdeFileState;
  selected_text?: string;
  diagnostics?: IdeDiagnostic[];
  workspace?: IdeWorkspaceState;
  git?: IdeGitState;
}

// =============================================================================
// Context objects
// =============================================================================

/**
 * Type categories for context objects.
 *
 * The type controls how the backend and model interpret the content:
 *   text       — plain text string
 *   file_url   — a URL pointing to a remote file (model receives the URL, not content)
 *   json       — structured object or array
 *   db_ref     — database reference (rows returned by a query)
 *   user       — user profile object
 *   org        — organization object
 *   workspace  — workspace object
 *   project    — project object
 *   task       — task object
 *
 * When you send an ad-hoc key (not in the agent's slot definitions), the type
 * is inferred: plain string → text, URL string → file_url, object/array → json.
 */
export type ContextObjectType =
  | "text"
  | "file_url"
  | "json"
  | "db_ref"
  | "user"
  | "org"
  | "workspace"
  | "project"
  | "task";

/**
 * Allowed content value shapes for the context dict.
 */
export type ContextValue =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | unknown[];

// =============================================================================
// Agent start request
// =============================================================================

/**
 * POST /ai/agents/{agent_id}
 *
 * Starts a new agent conversation. All fields except user_input are optional.
 * The response is a JSONL stream of StreamEvent objects.
 */
export interface AgentStartRequest {
  /**
   * The user's message for this turn.
   * - Plain string: treated as a single text block.
   * - Array: a mixed list of typed content blocks.
   */
  user_input?: string | ContentBlock[] | null;

  /**
   * Key-value substitution into {{variable_name}} placeholders in the
   * agent's system prompt. Agent-defined defaults apply for missing keys.
   */
  variables?: Record<string, unknown> | null;

  /**
   * Override any LLM parameter for this request only.
   * Does not affect the agent's stored configuration.
   */
  config_overrides?: LLMParams | null;

  /**
   * Default true. Set false only for testing / non-streaming use.
   */
  stream?: boolean;

  /**
   * Enable verbose debug output in server logs. Default false.
   */
  debug?: boolean;

  /**
   * Tool names the CLIENT will execute instead of the server.
   * When the model calls one of these, a tool_call stream event is emitted
   * instead of running the tool server-side. The client must handle the call
   * and continue the conversation with the result.
   */
  client_tools?: string[];

  /**
   * Inline tool definitions not stored in the registry.
   * Each tool is always delegated back to the caller — its name is
   * automatically added to client_tools; you do NOT need to list it there.
   * These are merged with any custom_tools from the agent's own definition.
   * See CustomToolDefinition for the full schema.
   */
  custom_tools?: CustomToolDefinition[];

  /**
   * Current IDE/editor snapshot. Fields become vsc_* substitution variables.
   * Agents must declare any vsc_* variables they want to use.
   * vsc_get_state tool is auto-injected when this is present.
   */
  ide_state?: IdeState | null;

  /**
   * Deferred context objects keyed by arbitrary string names.
   *
   * The system builds a manifest from these values and the agent's slot
   * definitions. The manifest is appended as ephemeral text to the current
   * user message (never persisted). The model uses ctx_get to retrieve items.
   *
   * Keys may match agent-defined context_slots (which supply type, label,
   * description, max_inline_chars) or be completely ad-hoc (type is inferred).
   */
  context?: Record<string, ContextValue>;

  /**
   * Organizational scope — injected into AppContext and consumed automatically
   * by every tool the model calls. The model never passes these in tool arguments.
   *
   * Effects by tool/system:
   *   - memory_store/recall/search: scopes "project" memories to project_id,
   *     "organization" memories to organization_id.
   *   - fs_read/write/list, code_run, shell: sandboxes to
   *     /workspaces/{user_id}/{project_id}/
   *   - sub-agents (fork_for_child_agent): inherit the same scope.
   *   - ctx_get: stamps active_scope metadata for manifest generation.
   *
   * If omitted the tools still work — memory is user-scoped only, filesystem is
   * user-level only, and project/org scoping is unavailable.
   */
  organization_id?: string | null;
  workspace_id?: string | null;
  project_id?: string | null;
  task_id?: string | null;
}

// =============================================================================
// Custom tools (inline tool definitions — not stored in the tool registry)
// =============================================================================

/**
 * JSON Schema for a custom tool's input parameters.
 * The type must be "object". Properties defines the named parameters;
 * required lists parameter names that must be present in every call.
 */
export interface CustomToolInputSchema {
  type: "object";
  properties: Record<
    string,
    {
      type: string;
      description?: string;
      enum?: unknown[];
      [key: string]: unknown;
    }
  >;
  required?: string[];
}

/**
 * An inline tool definition provided directly in the request or stored in
 * agents.custom_tools — not looked up in the tool registry.
 *
 * Follows the MCP Tool standard exactly:
 *   https://spec.modelcontextprotocol.io/specification/server/tools/
 *
 * The model sees the tool exactly as defined here. Calls are ALWAYS delegated
 * back to the caller — there is no server-side implementation. You do not need
 * to list the tool name in client_tools; it is added automatically.
 *
 * custom_tools can come from two places:
 *   1. Agent definition (agents.custom_tools column) — baked in for every
 *      request to that agent.
 *   2. Runtime request (custom_tools field below) — present for that turn only.
 *
 * Example:
 * ```json
 * {
 *   "name": "get_customer_status",
 *   "description": "Return the current subscription status for a customer.",
 *   "input_schema": {
 *     "type": "object",
 *     "properties": {
 *       "customer_id": { "type": "string", "description": "The customer UUID." }
 *     },
 *     "required": ["customer_id"]
 *   }
 * }
 * ```
 */
export interface CustomToolDefinition {
  /** Unique tool name. Must match [a-zA-Z0-9_-]{1,64}. */
  name: string;
  /** Human-readable description shown to the model. Be specific. */
  description?: string;
  /** JSON Schema for the tool's input parameters. */
  input_schema?: CustomToolInputSchema;
}

// =============================================================================
// Conversation continue request
// =============================================================================

/**
 * POST /ai/conversations/{conversation_id}
 *
 * Continue an existing conversation (turn 2+).
 * - user_input is required (unlike AgentStartRequest where it is optional).
 * - variables is not accepted — variable substitution is session-level (turn 1 only).
 * - For ide_state: only selected_text and diagnostics are re-injected per turn.
 *   Stable fields (git, workspace, active_file) were set on turn 1.
 */
export interface ConversationContinueRequest {
  user_input: string | ContentBlock[];
  config_overrides?: LLMParams | null;
  stream?: boolean;
  debug?: boolean;
  client_tools?: string[];
  /**
   * Inline tool definitions for this turn only. Same semantics as
   * AgentStartRequest.custom_tools. Names are auto-added to client_tools.
   */
  custom_tools?: CustomToolDefinition[];
  ide_state?: IdeState | null;
  context?: Record<string, ContextValue>;

  /**
   * Organizational scope — same semantics as AgentStartRequest.
   * Typically omitted on turn 2+ if the scope is stable across the conversation.
   * Only send if the scope changes mid-conversation (e.g., user switches project).
   */
  organization_id?: string | null;
  workspace_id?: string | null;
  project_id?: string | null;
  task_id?: string | null;
}

/** POST /ai/conversations/{conversation_id}/tool_results */
export interface ToolResultsRequest {
  results: ClientToolResult[];
}

export interface ToolResultsResponse {
  resolved: string[];
  count: number;
}

// =============================================================================
// Context system — slot and ctx_get types
// =============================================================================

/**
 * Agent-defined context slot.
 *
 * Stored in prompts.context_slots / prompt_builtins.context_slots JSONB column.
 * Loaded as part of the agent definition and carried on Agent.context_slots,
 * so sub-agents and tools have access without a second DB lookup.
 *
 * Clients do NOT send slots. Clients send content in the `context` dict.
 * Slots shape how that content is interpreted (type, label, truncation, summary).
 *
 * Slot / ad-hoc resolution rules:
 *   - context key matches a slot  → slot's type/label/description/max_inline_chars apply
 *   - context key has no slot     → type inferred: string → "text", URL → "file_url", object/array → "json"
 *   - slot defined, no content sent → silently skipped (not an error)
 *
 * This type is exported for UIs that want to display an agent's expected context keys.
 */
export interface ContextSlot {
  key: string;
  type: ContextObjectType;
  label?: string;
  description?: string;
  /**
   * When set, content larger than this many characters is truncated in the
   * Tier 2 manifest. Model calls ctx_get(key, mode="page") to read the rest.
   */
  max_inline_chars?: number;
  /**
   * When set, ctx_get(key, mode="summary") is available.
   * Value is an agent_id. Sub-agent receives full content in {{content}}.
   */
  summary_agent_id?: string;
}

/** Response from ctx_get(mode="full") */
export interface CtxGetFullResult {
  key: string;
  type: ContextObjectType;
  label: string;
  content: string;
  total_chars: number;
}

/**
 * Response from ctx_get(mode="page").
 * Paginate by calling ctx_get again with offset = next_offset.
 * Stop when has_more is false.
 */
export interface CtxGetPageResult {
  key: string;
  type: ContextObjectType;
  label: string;
  content: string;
  offset: number;
  chars_returned: number;
  total_chars: number;
  has_more: boolean;
  next_offset: number | null;
}

/**
 * Response from ctx_get(mode="summary").
 * Only available when the slot has summary_agent_id configured.
 * Returns an AI-generated summary instead of the raw content.
 */
export interface CtxGetSummaryResult {
  key: string;
  type: ContextObjectType;
  label: string;
  summary: string;
  total_chars: number;
}

export type CtxGetResult =
  | CtxGetFullResult
  | CtxGetPageResult
  | CtxGetSummaryResult;

// =============================================================================
// Stream events
// =============================================================================

/** Initial connection / status message. */
export interface MessageEvent {
  event: "message";
  data: { content: string };
}

/** A single token chunk streamed from the model. */
export interface ChunkEvent {
  event: "chunk";
  data: { content: string };
}

/**
 * The model called a tool listed in client_tools.
 * The AI loop is now SUSPENDED — POST results to
 *   POST /ai/conversations/{id}/tool_results
 * to resume it. 120-second timeout before the model gets an error result.
 * Multiple tool_delegated events may arrive in one turn for parallel tool calls.
 * Batch all results into a single tool_results POST.
 */
export interface ToolDelegatedEvent {
  event: "tool_delegated";
  data: {
    tool_name: string;
    call_id: string;
    arguments: Record<string, unknown>;
  };
}

/**
 * One or more structured input blocks had scrape/fetch failures.
 * The model's context already includes failure notices. Show this as a UI warning.
 */
export interface StructuredInputWarningEvent {
  event: "structured_input_warning";
  data: {
    type: string; // e.g. "input_webpage"
    failures: Array<{
      url?: string;
      reason: string;
    }>;
  };
}

/** Structured data payload (tool results, summaries, etc.). Shape varies by source. */
export interface DataEvent {
  event: "data";
  data: Record<string, unknown>;
}

/** Stream finished successfully. */
export interface EndEvent {
  event: "end";
  data: Record<string, never>;
}

/** Fatal error — stream closes after this. */
export interface ErrorEvent {
  event: "error";
  data: { message: string };
}

export type StreamEvent =
  | MessageEvent
  | ChunkEvent
  | ToolDelegatedEvent
  | StructuredInputWarningEvent
  | DataEvent
  | EndEvent
  | ErrorEvent;
