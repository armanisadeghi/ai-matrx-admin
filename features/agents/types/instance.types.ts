/**
 * Execution Instance Types
 *
 * Each execution context is keyed by a conversationId — a plain UUID that
 * doubles as the server-side conversation thread identifier. The client
 * generates the ID upfront and sends it to the server on the first request.
 *
 * Key principle: instances NEVER write back to agent source slices.
 * They read from them (for defaults) and maintain their own override layers.
 * Multiple conversations for the same agent coexist with zero shared mutable state.
 */

import { AgentType } from "./agent-definition.types";
import { ContextObjectType, LLMParams } from "./agent-api-types";
import type { SystemInstruction } from "./agent-api-types";
import type { ApplicationScope } from "@/features/agents/utils/scope-mapping";
import type { LaunchResult } from "@/features/agents/redux/execution-system/thunks/launch-agent-execution.thunk";
import type { VariableInputStyle } from "./variable-input-style";

// =============================================================================
// Completion Stats — re-exported from auto-generated stream-events.ts
//
// NEVER hand-write these types. The auto-generated UserRequestResult and its
// nested types (AggregatedUsageResult, TimingStatsResult, ToolCallStatsResult)
// are the single source of truth.
// =============================================================================

export type { UserRequestResult as CompletionStats } from "@/types/python-generated/stream-events";
export type {
  AggregatedUsageResult,
  ModelUsageSummary,
  UsageTotals,
  TimingStatsResult,
  ToolCallStatsResult,
  ToolCallByTool,
} from "@/types/python-generated/stream-events";

// =============================================================================
// Instance Shell
// =============================================================================

export type InstanceStatus =
  | "draft" // Being configured (manual or pre-autoRun)
  | "ready" // Fully configured, awaiting execution
  | "running" // API call in flight
  | "streaming" // Receiving stream chunks
  | "paused" // Waiting for client tool results
  | "complete" // Stream ended successfully
  | "error"; // Stream ended with error

export type InstanceOrigin =
  | "manual" // User opened the agent runner
  | "shortcut" // Triggered by a shortcut
  | "test" // Created as part of parallel testing
  | "sub-agent"; // Spawned by a parent request

export type SourceFeature =
  | "agent-builder"
  | "agent-runner"
  | "chat"
  | "context-menu"
  | "prompt-app"
  | "research"
  | "code-editor";

export const SOURCE_APP = "matrx-admin" as const;

export interface ExecutionInstance {
  conversationId: string;
  agentId: string;
  agentType: AgentType;
  origin: InstanceOrigin;
  shortcutId: string | null;
  status: InstanceStatus;
  sourceApp: string;
  sourceFeature: SourceFeature;
  /** True until the server confirms this conversation ID via X-Conversation-ID header */
  cacheOnly: boolean;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Model Overrides — three-state delta layer
// =============================================================================

/**
 * The override layer for an instance's model config.
 *
 * CRITICAL: baseSettings is a snapshot copied from the agent at creation time.
 * No component or selector should ever look up agentId for model settings.
 *
 * Three states for any setting key:
 *   - NOT in overrides AND NOT in removals → untouched, falls through to baseSettings
 *   - IN overrides → changed to a new value
 *   - IN removals → explicitly removed (do not send, even if default exists)
 */
export interface InstanceModelOverrideState {
  conversationId: string;
  /** Snapshot of agent's LLM settings at instance creation. Never look up agentId again. */
  baseSettings: Partial<LLMParams>;
  overrides: Partial<LLMParams>;
  removals: string[];
}

// =============================================================================
// Resources — content blocks with lifecycle
// =============================================================================

export type ResourceStatus =
  | "pending" // Just added, not yet processed
  | "resolving" // Client-side processing in progress (e.g., URL scraping)
  | "ready" // Resolved and ready for the API call
  | "error"; // Resolution failed

/**
 * All possible resource/content block types.
 * Maps to the ContentBlock union from the AI API types.
 */
export type ResourceBlockType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "youtube_video"
  | "document"
  | "input_webpage"
  | "input_notes"
  | "input_task"
  | "input_table"
  | "input_list"
  | "input_data";

export interface ResourceOptions {
  keepFresh: boolean;
  editable: boolean;
  convertToText: boolean;
  optionalContext: boolean;
  template?: "full" | "compact" | "minimal";
}

export interface ManagedResource {
  resourceId: string;
  blockType: ResourceBlockType;

  /** Raw input: URL string, file data, note IDs, bookmark objects, etc. */
  source: unknown;

  /** Client-resolved preview for the UI (scraped text, image thumbnail, etc.) */
  preview: unknown | null;

  /** Current lifecycle status */
  status: ResourceStatus;

  /** Error message if status is 'error' */
  errorMessage: string | null;

  /** Did the user modify the resolved content? */
  userEdited: boolean;

  /** The user's modified version (only when userEdited is true) */
  editedContent: unknown | null;

  /** Behavioral flags */
  options: ResourceOptions;

  /** The assembled ContentBlock payload ready for the API call */
  finalPayload: Record<string, unknown> | null;

  /** Sort order for display and payload assembly */
  sortOrder: number;
}

// =============================================================================
// Instance Context — deferred context dict
// =============================================================================

export interface InstanceContextEntry {
  key: string;
  value: unknown;

  /** Whether this key matched an agent-defined context slot */
  slotMatched: boolean;

  /** If slot-matched, the slot's type. Otherwise inferred. */
  type: ContextObjectType;

  /** Display label (from slot or auto-generated) */
  label: string;
}

// =============================================================================
// User Input — message composition
// =============================================================================

export interface InstanceUserInputState {
  conversationId: string;

  /** Plain text input from the user */
  text: string;

  /**
   * If the user is composing mixed content (text + inline images, etc.),
   * this holds the structured blocks. When null, `text` is the only input.
   */
  contentBlocks: Array<Record<string, unknown>> | null;
}

// =============================================================================
// Instance UI State
// =============================================================================

export type ResultDisplayMode =
  | "modal-full"
  | "modal-compact"
  | "chat-bubble"
  | "inline"
  | "sidebar"
  | "flexible-panel"
  | "panel"
  | "toast"
  | "floating-chat"
  | "direct"
  | "background"
  | "chat-collapsible"
  | "chat-assistant";

/**
 * Transient builder/test settings sent to the chat endpoint on each call.
 * NOT persisted with the agent definition — destroyed with the instance.
 */
export interface BuilderAdvancedSettings {
  debug: boolean;
  store: boolean;
  maxIterations: number;
  maxRetriesPerIteration: number;

  /**
   * When true, the system message from the agent's priming messages is extracted
   * and sent as a structured `system_instruction` object instead of being included
   * inline in the `messages` array.
   *
   * The structured form unlocks the server's SystemInstruction builder — intro,
   * outro, content_blocks, tools_list, date injection, guidelines sections, etc.
   *
   * Default: false — the simple path (system message stays in messages[]).
   */
  useStructuredSystemInstruction: boolean;

  /**
   * User-provided overrides for structured system instruction fields.
   * Only applied when `useStructuredSystemInstruction` is true.
   * The `content` / `base_instruction` field is auto-populated from the
   * agent's system message — the rest are additive fields the user configures
   * via the structured instruction modal.
   */
  structuredInstruction: Partial<SystemInstruction>;
}

export const DEFAULT_BUILDER_ADVANCED_SETTINGS: BuilderAdvancedSettings = {
  debug: false,
  store: false,
  maxIterations: 20,
  maxRetriesPerIteration: 2,
  useStructuredSystemInstruction: false,
  structuredInstruction: {},
};

export interface InstanceUIState {
  conversationId: string;
  displayMode: ResultDisplayMode;

  // ── Execution behavior ───────────────────────────────────────────────────
  /**
   * When true, execution starts automatically as soon as the instance has
   * sufficient input (variables filled, user input set, etc.).
   * When false, the user must explicitly trigger execution.
   */
  autoRun: boolean;

  /** Whether the user can continue chatting after the first response. */
  allowChat: boolean;

  // ── Pre-execution gate ───────────────────────────────────────────────────
  /**
   * When true, an intermediate input overlay is shown before the main display.
   * The user enters text, clicks "Continue", and then the main component renders.
   * Primarily for inline/toast/compact modes where the main display has no input.
   */
  usePreExecutionInput: boolean;

  /**
   * Flips to true after the user completes the pre-execution input step.
   * Components check: if usePreExecutionInput && !preExecutionSatisfied → show gate.
   */
  preExecutionSatisfied: boolean;

  // ── Variable & definition visibility (fine-grained) ──────────────────────
  /** Whether the variable input panel is visible. Independent of message visibility. */
  showVariablePanel: boolean;

  /**
   * Whether definition-sourced conversation turns (fabricated user messages from
   * the agent's priming definition) are visible at all. When false, the first N
   * turns (where N = hiddenMessageCount) are completely hidden.
   */
  showDefinitionMessages: boolean;

  /**
   * When definition messages ARE shown, whether the "secret" template portion
   * (system prompt instructions, variable placeholders in the raw form) is visible.
   * When false, only user-entered values (variables, resources, attachments) render.
   */
  showDefinitionMessageContent: boolean;

  /**
   * Number of agent-definition messages to hide from the conversation display.
   * Fetched from `agx_get_defined_data` RPC at instance creation time.
   *
   * ⚠️ TEMPORARY: This is a stopgap until the backend streams per-message
   * visibility flags (is_visible_to_user / is_visible_to_model).
   */
  hiddenMessageCount: number;

  // ── Callback integration ─────────────────────────────────────────────────
  /**
   * CallbackManager group ID for this instance's lifecycle callbacks
   * (onComplete, onTextReplace, onTextInsertBefore, onTextInsertAfter, etc.).
   * Stored as a string so Redux stays serializable. Actual function refs
   * live in the CallbackManager singleton.
   */
  callbackGroupId: string | null;

  // ── Layout & interaction ─────────────────────────────────────────────────
  isExpanded: boolean;

  /**
   * The variable row currently expanded into an edit popover.
   * null = no variable is expanded.
   */
  expandedVariableId: string | null;

  /**
   * Is the current user the creator/owner of the source agent?
   * Copied at instance creation — never look up agentId for this.
   */
  isCreator: boolean;

  /** Show creator-only debug panels (request preview, variable provenance, etc.) */
  showCreatorDebug: boolean;

  /**
   * Submit on Enter (vs Shift+Enter for newline).
   * Defaults to true; users can toggle per-instance.
   */
  submitOnEnter: boolean;

  /**
   * When true, the conversation history is cleared after each submission so
   * every send starts a fresh agent call with no prior turns. The server never
   * receives a conversationId from a previous turn.
   *
   * DEFAULT: true in builder/test mode (AgentBuilderRightPanel).
   * DEFAULT: false in run mode (AgentRunPage) where multi-turn is desired.
   */
  autoClearConversation: boolean;

  /**
   * When true, subsequent chat calls reuse the conversation_id from the first
   * response. When false (default), each call gets a fresh conversation.
   * Only applies to chat-mode instances (builder test runs).
   */
  reuseConversationId: boolean;

  /**
   * Builder-only control knobs sent to the chat endpoint.
   * Ephemeral — not saved with the agent definition.
   */
  builderAdvancedSettings: BuilderAdvancedSettings;

  // ── Content visibility ────────────────────────────────────────────────────
  /** When true, reasoning/thinking blocks are not shown in the message list. */
  hideReasoning: boolean;

  /** When true, tool-call result blocks are not shown in the message list. */
  hideToolResults: boolean;

  /**
   * Optional message shown in the pre-execution input gate.
   * Used to give the user context about what the agent expects.
   */
  preExecutionMessage: string | null;

  /**
   * Controls which variable input UI style is rendered.
   * - "inline"  — compact rows above the textarea (default)
   * - "wizard"  — one variable at a time, fixed-height card with Back/Skip/Skip All
   */
  variableInputStyle: VariableInputStyle;

  /**
   * Arbitrary UI state specific to the display mode.
   * E.g., scroll position, active tab, selected card, etc.
   */
  modeState: Record<string, unknown>;
}

// =============================================================================
// Launch Overrides
// =============================================================================

export interface LaunchAgentOverrides {
  displayMode?: ResultDisplayMode;
  autoRun?: boolean;
  allowChat?: boolean;

  /** Coarse visibility toggle — resolves to fine-grained fields in the thunk. */
  showVariables?: boolean;
  /** Fine-grained: override variable panel independently. */
  showVariablePanel?: boolean;
  /** Fine-grained: override definition message visibility independently. */
  showDefinitionMessages?: boolean;
  /** Fine-grained: override definition message content visibility independently. */
  showDefinitionMessageContent?: boolean;

  usePreExecutionInput?: boolean;
  autoClearConversation?: boolean;

  /**
   * Controls which execution path and history strategy is used.
   *
   * "agent"        — Default. Turn 1 → POST /ai/agents/{id}. Turn 2+ → POST /ai/conversations/{id}.
   *                  Server owns history. Client only stores for display.
   *
   * "conversation" — Same routing as "agent" after the first server turn commits a conversationId.
   *                  Transition: history slice auto-promotes "agent" → "conversation" on first assistant turn.
   *
   * "chat"         — Always POST /api/ai/chat. Client owns history and sends full messages[] on every turn.
   *                  Used exclusively by the builder so it reads the LIVE unsaved agent definition.
   *                  No other surface should use this mode.
   */
  conversationMode?: "agent" | "conversation" | "chat";

  userInput?: string;
  variables?: Record<string, unknown>;

  /**
   * LLM parameter overrides applied on top of the agent's base settings.
   * These are delta-only — only keys you provide are sent.
   * Use this in the runner, chat, and widgets to adjust temperature, model, etc.
   * NOT applicable in builder mode (builder always reads the full live agent definition).
   */
  overrides?: Partial<LLMParams>;

  sourceFeature?: SourceFeature;
  applicationScope?: ApplicationScope;
  variableInputStyle?: VariableInputStyle;

  /** Called once when the execution completes (all modes). */
  onComplete?: (result: LaunchResult) => void;

  /**
   * Text-manipulation callbacks for context-menu / editor integrations.
   * When provided, they are registered with CallbackManager and invoked
   * once the AI response is ready. (Connection to the editor/notes trigger
   * points is the next integration milestone — these are wired but not yet
   * triggered by any UI surface.)
   */
  onTextReplace?: (text: string) => void;
  onTextInsertBefore?: (text: string) => void;
  onTextInsertAfter?: (text: string) => void;

  /**
   * The original text from the editor/notes that was selected before launch.
   * Stored for use by the text-manipulation callbacks above.
   */
  originalText?: string;
}

// =============================================================================
// Authoritative Execution Defaults
//
// This is the single source of truth for every configurable field in the
// execution system. All thunks, slices, and instance factories MUST derive
// their defaults from this object — never scatter magic values across files.
//
// Rules:
//   - "Current behavior" defaults are marked with a comment when the value
//     is intentionally different from what might seem intuitive.
//   - Fields that are computed (not a simple scalar) are marked "computed".
//   - Callback fields default to null/undefined — they are opt-in.
// =============================================================================

export const AGENT_EXECUTION_DEFAULTS = {
  // ── Display & Routing ──────────────────────────────────────────────────────

  /**
   * How the result is presented. "direct" means the caller manages the UI
   * (AgentRunPage, builder panel, etc.). All other modes open an overlay.
   */
  displayMode: "direct" as ResultDisplayMode,

  /**
   * Which execution path and history strategy to use.
   * "agent" is the standard path for all non-builder surfaces.
   * The slice auto-promotes to "conversation" after the first server turn.
   */
  conversationMode: "agent" as "agent" | "conversation" | "chat",

  // ── Execution Behavior ─────────────────────────────────────────────────────

  /**
   * Should the instance execute immediately after creation without the user
   * clicking submit? false = wait for explicit user action.
   *
   * Set to true only for programmatic triggers where the full context is
   * already assembled (e.g. flashcard "I'm confused" button).
   */
  autoRun: false,

  /**
   * Can the user send follow-up messages after the first response?
   * true = multi-turn conversation; false = single-shot only.
   */
  allowChat: true,

  /**
   * Show a gate UI before executing where the user provides initial text.
   * Used for inline/toast/compact modes that have no built-in input.
   */
  usePreExecutionInput: false,

  /**
   * When true, submitting creates a fresh instance (no history) instead of
   * continuing the current conversation. Only meaningful in builder/test mode.
   */
  autoClearConversation: false,

  // ── Visibility ─────────────────────────────────────────────────────────────

  /**
   * Coarse toggle: when true → showVariablePanel + showDefinitionMessages on.
   * Overridden by the fine-grained fields below.
   * undefined = fine-grained fields take effect individually.
   */
  showVariables: undefined as boolean | undefined,

  /** Show the variable input panel above the input area. */
  showVariablePanel: false,

  /**
   * Show agent-definition messages (fabricated priming turns) in the thread.
   * When false, the first N turns (hiddenMessageCount) are hidden from the user.
   */
  showDefinitionMessages: true,

  /**
   * When definition messages are shown, also show the raw template content
   * (system prompt, variable placeholders). When false, only filled values render.
   */
  showDefinitionMessageContent: false,

  // ── Variable Input ──────────────────────────────────────────────────────────

  /**
   * How variables are collected from the user before execution.
   * "inline" = compact rows above the textarea.
   * "wizard" = one-at-a-time card with Back/Skip/Skip All.
   */
  variableInputStyle: "inline" as VariableInputStyle,

  // ── Conversation History (UIState layer) ───────────────────────────────────

  /** Submit on Enter key; Shift+Enter = newline. */
  submitOnEnter: true,

  /**
   * For chat-mode instances: reuse the server's conversationId across calls
   * so the server can maintain its own history. When false, each call starts
   * fresh. Relevant only when conversationMode is "chat".
   */
  reuseConversationId: false,

  // ── Builder-Only ───────────────────────────────────────────────────────────

  /** Expose creator-only debug panels (request preview, variable provenance). */
  showCreatorDebug: false,

  /** Hide reasoning/thinking blocks from the message list. */
  hideReasoning: false,

  /** Hide tool-call result blocks from the message list. */
  hideToolResults: false,

  /** How many definition messages to hide (fetched from agx_get_defined_data). */
  hiddenMessageCount: 0,

  // ── Callbacks ──────────────────────────────────────────────────────────────

  /** Called once when execution completes. Registered in CallbackManager. */
  onComplete: null as null,

  /**
   * Text-manipulation callbacks for editor/notes context-menu integrations.
   * Not yet connected to any trigger surface — these are the future entry points.
   */
  onTextReplace: null as null,
  onTextInsertBefore: null as null,
  onTextInsertAfter: null as null,

  /**
   * The text that was selected in the editor when the launch was triggered.
   * Passed through to text-manipulation callbacks.
   */
  originalText: null as null,

  // ── Payload Fields (not stored in UIState) ─────────────────────────────────

  /** Pre-filled user message text. Stored in instanceUserInput. */
  userInput: null as null,

  /** Pre-filled variable values. Stored in instanceVariableValues. */
  variables: null as null,

  /**
   * LLM parameter overrides (delta from agent base settings).
   * Stored in instanceModelOverrides. Applied in execute-instance thunk.
   * Not used in chat mode (builder reads full live agent definition instead).
   */
  overrides: null as null,

  /** UI surface that triggered the launch. Stored on ExecutionInstance. */
  sourceFeature: "agent-runner" as SourceFeature,
} as const;

export type { VariableInputStyle } from "./variable-input-style";
