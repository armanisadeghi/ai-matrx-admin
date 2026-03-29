/**
 * cx-content-converter.ts
 *
 * Converts cx_message content blocks (from the database) into the format
 * the existing chat rendering pipeline understands.
 *
 * The rendering pipeline expects:
 *  - A flat `content: string` (markdown text, with `<thinking>` XML tags for thinking)
 *  - An optional `toolUpdates: ToolCallObject[]` array for tool call visualization
 *
 * This converter transforms structured CxContentBlock[] into those two pieces.
 */

import type {
  CxContentBlock,
  CxMessage,
  CxMessageRole,
  CxMessageDbStatus,
  CxToolCall,
  CxTextContent,
  CxThinkingContent,
  CxMediaContent,
  CxToolCallContent,
} from "@/features/cx-chat/types/cx-tables";
import type { ToolCallObject } from "@/lib/api/tool-call.types";

// ============================================================================
// Types for the converter output
// ============================================================================

/** Result of converting a single message's content blocks */
export interface ConvertedMessageContent {
  /** Markdown string for the rendering pipeline (text + thinking in XML tags + media as markdown) */
  content: string;
  /** Tool call/result visualizations */
  toolUpdates: ToolCallObject[];
}

/** Result of processing a full conversation from the database */
export interface ProcessedChatMessage {
  id: string;
  /** Display role mapped from DB role — use this for rendering */
  role: "user" | "assistant" | "system";
  /** Raw DB role before display mapping (e.g. 'output', 'tool') — preserved for full fidelity */
  dbRole: CxMessageRole;
  /** Flat markdown string for the rendering pipeline */
  content: string;
  /** Original content blocks from DB before any conversion — preserved for full fidelity */
  rawContent: CxContentBlock[];
  status: "complete";
  timestamp: Date;
  toolUpdates: ToolCallObject[];
  /** Whether this message was condensed (out of context window) */
  isCondensed: boolean;
  // ── Preserved DB fields ──────────────────────────────────────────────
  /** DB conversation_id this message belongs to */
  conversationId: string;
  /** Message position in the conversation (0-based) */
  position: number;
  /** Raw DB status field before display mapping */
  dbStatus: CxMessageDbStatus;
  /** Raw metadata JSON from DB */
  dbMetadata: Record<string, unknown>;
  /** Content version history from DB */
  contentHistory: unknown | null;
  /** ISO creation timestamp from DB */
  createdAt: string;
  /** Soft-delete timestamp from DB, null if active */
  deletedAt: string | null;
  /** Full CxToolCall DB records for tool calls invoked by this message — preserved for full fidelity */
  rawToolCalls: CxToolCall[];
}

// ============================================================================
// Helpers
// ============================================================================

/** Safely coerce a value into a Record<string, unknown>.
 *  - If it's already an object, return it directly (DB often stores jsonb objects, not strings).
 *  - If it's a JSON string, parse it.
 *  - Otherwise wrap the raw value.
 */
function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null
        ? parsed
        : { value: parsed };
    } catch {
      return { raw: value };
    }
  }
  return { value };
}

// ============================================================================
// Single message content conversion
// ============================================================================

/**
 * Convert a single message's CxContentBlock[] array into display-ready format.
 *
 * - `text` blocks → joined as markdown
 * - `thinking` blocks → wrapped in `<thinking>` XML tags (content-splitter-v2 recognizes these)
 * - `media` blocks → markdown image syntax for images, links for others
 * - `tool_call` blocks → tool update objects for ToolCallVisualization
 * - `tool_result` blocks → paired tool update objects
 */
export function convertCxContentToDisplay(
  contentBlocks: CxContentBlock[] | unknown,
): ConvertedMessageContent {
  // Handle non-array input gracefully
  if (!Array.isArray(contentBlocks)) {
    const fallback = typeof contentBlocks === "string" ? contentBlocks : "";
    return { content: fallback, toolUpdates: [] };
  }

  const parts: string[] = [];
  const toolUpdates: ToolCallObject[] = [];

  for (const block of contentBlocks) {
    if (!block || typeof block !== "object" || !("type" in block)) {
      continue;
    }

    switch (block.type) {
      case "text": {
        const textBlock = block as CxTextContent;
        if (textBlock.text) {
          parts.push(textBlock.text);
        }
        break;
      }

      case "thinking": {
        const thinkingBlock = block as CxThinkingContent;
        // Use text if available, otherwise join summary item texts, otherwise placeholder
        const thinkingText =
          thinkingBlock.text ||
          (thinkingBlock.summary && thinkingBlock.summary.length > 0
            ? thinkingBlock.summary.map((s) => s.text).join("\n")
            : "Thinking...");
        // Wrap in XML tags — content-splitter-v2 recognizes <thinking> and <think>
        parts.push(`<reasoning>\n${thinkingText}\n</reasoning>`);
        break;
      }

      case "media": {
        const mediaBlock = block as CxMediaContent;
        if (!mediaBlock.url) break;

        switch (mediaBlock.kind) {
          case "image":
            // Markdown image syntax — content-splitter-v2 recognizes this
            parts.push(`![image](${mediaBlock.url})`);
            break;
          case "video":
            // Link with video indicator
            parts.push(`[Video](${mediaBlock.url})`);
            break;
          case "audio":
            parts.push(`[Audio](${mediaBlock.url})`);
            break;
          case "document":
            parts.push(`[Document](${mediaBlock.url})`);
            break;
          default:
            parts.push(`[Attachment](${mediaBlock.url})`);
        }
        break;
      }

      case "tool_call": {
        const raw = block as CxToolCallContent;
        if (!raw.id) {
          console.error(
            "[convertCxContentToDisplay] tool_call block missing id",
            block,
          );
          break;
        }

        toolUpdates.push({
          id: raw.id,
          type: "mcp_input",
          mcp_input: {
            name: raw.name,
            arguments: raw.arguments,
          },
          phase: "complete",
        });
        break;
      }

      case "tool_result": {
        // `call_id` (OpenAI) or `tool_use_id` (Anthropic) is the join key.
        // If neither is present, Python has a normalization bug.
        const raw = block as Record<string, unknown>;
        const trId = (raw.call_id ?? raw.tool_use_id ?? "") as string;
        const isError = Boolean(raw.is_error);
        const trContent = raw.content;

        if (isError) {
          toolUpdates.push({
            id: trId,
            type: "mcp_error",
            mcp_error:
              typeof trContent === "string"
                ? trContent
                : JSON.stringify(trContent),
          });
        } else {
          // Wrap in { status, result } to match the streaming mcp_output shape
          // that the tool renderers expect.
          // Preserve the original content type — it can be a string, object,
          // array, or any other JSON value.
          const resultValue =
            typeof trContent === "object" && trContent !== null
              ? trContent
              : (trContent ?? null);
          toolUpdates.push({
            id: trId,
            type: "mcp_output",
            mcp_output: {
              status: "success",
              result: resultValue,
            },
          });
        }
        break;
      }

      default: {
        // Unknown block type — try to extract any text content
        const unknownBlock = block as Record<string, unknown>;
        if (typeof unknownBlock.text === "string" && unknownBlock.text) {
          parts.push(unknownBlock.text);
        }
      }
    }
  }

  return {
    content: parts.join("\n\n"),
    toolUpdates,
  };
}

// ============================================================================
// Build tool updates from cx_tool_call records
// ============================================================================

/**
 * Build ToolCallObject pairs (input + output) from a CxToolCall record.
 *
 * All DB-loaded tool calls are finished — phase is always 'complete' (or 'error').
 * This is used for V2 tool-role messages where content is [] and the actual
 * tool data lives in the cx_tool_call table.
 */
function buildToolUpdatesFromToolCall(tc: CxToolCall): ToolCallObject[] {
  const updates: ToolCallObject[] = [];
  const isError = tc.is_error || !tc.success;

  // Input — carries phase so ToolCallVisualization shows checkmark/error icon
  updates.push({
    id: tc.call_id,
    type: "mcp_input",
    mcp_input: {
      name: tc.tool_name,
      arguments: tc.arguments,
    },
    phase: isError ? "error" : "complete",
  });

  // Output or error
  if (isError) {
    updates.push({
      id: tc.call_id,
      type: "mcp_error",
      mcp_error: tc.error_message || tc.output || "Tool execution failed",
    });
  } else if (tc.output != null) {
    let resultValue: unknown;
    if (tc.output_type === "json") {
      try {
        resultValue = JSON.parse(tc.output);
      } catch {
        resultValue = tc.output;
      }
    } else {
      resultValue = tc.output;
    }

    updates.push({
      id: tc.call_id,
      type: "mcp_output",
      mcp_output: {
        status: "success",
        result: resultValue,
      },
    });
  }

  return updates;
}

// ============================================================================
// Full conversation processing
// ============================================================================

/**
 * Build a call_id → CxToolCall lookup map from an array of tool call records.
 */
export function buildToolCallMap(
  toolCalls: CxToolCall[],
): Map<string, CxToolCall> {
  return new Map(toolCalls.map((tc) => [tc.call_id, tc]));
}

/**
 * Process an array of CxMessage rows from the database into display-ready ChatMessages.
 *
 * Handles:
 * - Converting all content block types
 * - Enriching assistant/output messages with tool call output from cx_tool_call records
 * - Skipping `tool`-role messages (V2: always content: [], data is on the assistant message)
 * - Filtering out `summary` and `deleted` status messages
 * - Marking `condensed` messages
 *
 * @param dbMessages Messages ordered by position
 * @param toolCalls Optional array of CxToolCall records for the conversation.
 */
export function processDbMessagesForDisplay(
  dbMessages: CxMessage[],
  toolCalls?: CxToolCall[],
): ProcessedChatMessage[] {
  const result: ProcessedChatMessage[] = [];

  const callIdToolCallMap = toolCalls ? buildToolCallMap(toolCalls) : null;

  for (const msg of dbMessages) {
    // Skip summary and deleted messages
    if (msg.status === "summary" || msg.status === "deleted") {
      continue;
    }

    const isCondensed = msg.status === "condensed";

    if (msg.role === "tool") {
      // V2: tool-role messages always have content: [] — the actual tool output
      // lives in cx_tool_call and is enriched onto the preceding assistant message
      // via callIdToolCallMap. Skip these rows entirely.
      continue;
    }

    // Process user / assistant / system messages
    const { content, toolUpdates } = convertCxContentToDisplay(msg.content);

    // For assistant and output messages with tool_call content blocks, enrich with
    // cx_tool_call output data so the full input+output is available.
    // Also collect the raw CxToolCall records so all rich metadata is preserved.
    const rawToolCalls: CxToolCall[] = [];
    if (
      (msg.role === "assistant" || msg.role === "output") &&
      callIdToolCallMap &&
      toolUpdates.length > 0
    ) {
      const enrichedUpdates = [...toolUpdates];
      for (const tu of toolUpdates) {
        if (tu.type === "mcp_input") {
          const tc = callIdToolCallMap.get(tu.id);
          if (tc) {
            // Collect the full DB record — has execution_events, duration, tokens, cost, etc.
            rawToolCalls.push(tc);
            if (tc.output != null || tc.is_error) {
              // Add the output/error entry from the tool call record
              const outputUpdates = buildToolUpdatesFromToolCall(tc);
              // Only add the output part (input already represented by the content block)
              const outputOnly = outputUpdates.filter(
                (u) => u.type !== "mcp_input",
              );
              enrichedUpdates.push(...outputOnly);
            }
          }
        }
      }
      // Replace with enriched set
      toolUpdates.length = 0;
      toolUpdates.push(...enrichedUpdates);
    }

    // Map DB role to display role — explicitly handle every known role.
    // Unknown roles log an error so they surface during development.
    let displayRole: "user" | "assistant" | "system";
    switch (msg.role as string) {
      case "user":
        displayRole = "user";
        break;
      case "system":
        displayRole = "system";
        break;
      case "assistant":
      case "output": // OpenAI intermediate thinking/reasoning output
        displayRole = "assistant";
        break;
      default:
        console.error(
          `[processDbMessagesForDisplay] Unknown DB role "${msg.role}" on message ${msg.id} (position ${msg.position}) — defaulting to "assistant". Add this role to CxMessageRole and update the role mapping.`,
          { id: msg.id, role: msg.role, position: msg.position },
        );
        displayRole = "assistant";
    }

    result.push({
      id: msg.id,
      role: displayRole,
      dbRole: msg.role,
      content,
      rawContent: Array.isArray(msg.content) ? [...msg.content] : [],
      status: "complete",
      timestamp: new Date(msg.created_at),
      toolUpdates,
      rawToolCalls,
      isCondensed,
      conversationId: msg.conversation_id,
      position: msg.position,
      dbStatus: msg.status,
      dbMetadata: msg.metadata,
      contentHistory: msg.content_history,
      createdAt: msg.created_at,
      deletedAt: msg.deleted_at,
    });
  }

  return result;
}
