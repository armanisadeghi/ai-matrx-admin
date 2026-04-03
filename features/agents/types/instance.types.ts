/**
 * Execution Instance Types
 *
 * Instances are ephemeral, client-only entities that represent a single
 * execution context for an agent. They are created when a user wants to
 * run an agent (manually, via shortcut, or in parallel testing).
 *
 * Key principle: instances NEVER write back to agent source slices.
 * They read from them (for defaults) and maintain their own override layers.
 * Multiple instances of the same agent coexist with zero shared mutable state.
 */

import { AgentType } from "./agent-definition.types";
import { ContextObjectType, LLMParams } from "./agent-api-types";

// =============================================================================
// Completion Stats — full payload from the server's completion stream event
// =============================================================================

export interface ModelUsage {
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  total_tokens: number;
  api: string;
  request_count: number;
  cost: number;
}

export interface CompletionStats {
  status: string;
  iterations: number;
  finish_reason: string;
  total_usage: {
    by_model: Record<string, ModelUsage>;
    total: {
      input_tokens: number;
      output_tokens: number;
      cached_input_tokens: number;
      total_tokens: number;
      total_requests: number;
      unique_models: number;
      total_cost: number;
    };
  };
  timing_stats: {
    total_duration: number;
    api_duration: number;
    tool_duration: number;
    iterations: number;
    avg_iteration_duration: number;
  };
  tool_call_stats: {
    total_tool_calls: number;
    iterations_with_tools: number;
    by_tool: Record<string, unknown>;
  };
  metadata: unknown;
}

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

export interface ExecutionInstance {
  instanceId: string;
  agentId: string;
  agentType: AgentType;
  origin: InstanceOrigin;
  shortcutId: string | null;
  status: InstanceStatus;
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
  instanceId: string;
  /** Snapshot of agent's LLM settings at instance creation. Never look up agentId again. */
  baseSettings: Partial<LLMParams>;
  overrides: Partial<LLMParams>;
  removals: string[]; // keys that are explicitly removed
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
  instanceId: string;

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
  | "panel"
  | "toast";

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
}

export const DEFAULT_BUILDER_ADVANCED_SETTINGS: BuilderAdvancedSettings = {
  debug: false,
  store: false,
  maxIterations: 20,
  maxRetriesPerIteration: 2,
  useStructuredSystemInstruction: false,
};

export interface InstanceUIState {
  instanceId: string;
  displayMode: ResultDisplayMode;
  allowChat: boolean;
  showVariablePanel: boolean;
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

  /**
   * Show creator-only debug panels (request preview, variable provenance, etc.)
   */
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

  /**
   * Arbitrary UI state specific to the display mode.
   * E.g., scroll position, active tab, selected card, etc.
   */
  modeState: Record<string, unknown>;
}
