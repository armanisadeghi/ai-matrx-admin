/**
 * lib/chat-protocol/index.ts
 *
 * Public API for the chat protocol layer.
 *
 * Import from here — never import directly from the individual files.
 * This gives us a stable surface to refactor internals without updates
 * propagating to every consumer.
 *
 * ─── TYPES ───────────────────────────────────────────────────────────────────
 *   CanonicalMessage    The top-level unit passed to renderers
 *   CanonicalBlock      Discriminated union of all renderable content blocks
 *   TextBlock           Markdown text
 *   ThinkingBlock       AI reasoning / thinking trace
 *   MediaBlock          Image, audio, video, or document
 *   ToolCallBlock       Complete tool interaction (input + output/error)
 *   ErrorBlock          Stream- or message-level error
 *   StreamingState      Live view while a stream is in progress
 *   ToolInput / ToolOutput / ToolError / ToolProgress  (tool sub-types)
 *   MessageRole / MessageStatus
 *   ProtocolVersion / PROTOCOL_VERSION
 *
 * ─── FROM STREAM ─────────────────────────────────────────────────────────────
 *   buildCanonicalBlocks            TypedStreamEvent[] → CanonicalBlock[]
 *   buildStreamingState             TypedStreamEvent[] → StreamingState  (live)
 *   buildCanonicalMessageFromStream TypedStreamEvent[] → CanonicalMessage (complete)
 *   extractPersistableToolBlocks    TypedStreamEvent[] → ToolCallBlock[]  (for DB save)
 *
 * ─── FROM DB ─────────────────────────────────────────────────────────────────
 *   buildCanonicalMessages   CxMessage[] + CxToolCall[]? → CanonicalMessage[]
 *   buildCanonicalMessage    CxMessage  + CxToolCall[]? → CanonicalMessage | null
 *
 * ─── ADAPTERS (legacy compatibility) ─────────────────────────────────────────
 *   canonicalToLegacy        CanonicalMessage  → LegacyChatMessage
 *   canonicalArrayToLegacy   CanonicalMessage[] → LegacyChatMessage[]
 *   toolCallBlockToLegacy    ToolCallBlock → LegacyToolCallObject[]
 *
 * ─── TYPE GUARDS ─────────────────────────────────────────────────────────────
 *   isTextBlock / isThinkingBlock / isMediaBlock / isToolCallBlock / isErrorBlock
 */

// Types
export type {
  CanonicalMessage,
  CanonicalBlock,
  TextBlock,
  ThinkingBlock,
  MediaBlock,
  ToolCallBlock,
  ErrorBlock,
  StreamingState,
  ToolInput,
  ToolOutput,
  ToolError,
  ToolProgress,
  MessageRole,
  MessageStatus,
  ProtocolVersion,
} from "./types";

export {
  PROTOCOL_VERSION,
  isTextBlock,
  isThinkingBlock,
  isMediaBlock,
  isToolCallBlock,
  isErrorBlock,
} from "./types";

// Stream normalizer
export {
  buildCanonicalBlocks,
  buildStreamingState,
  buildCanonicalMessageFromStream,
  extractPersistableToolBlocks,
} from "./from-stream";

// DB normalizer
export { buildCanonicalMessages, buildCanonicalMessage } from "./from-db";

// Legacy adapters
export type {
  LegacyChatMessage,
  LegacyToolCallObject,
  LegacyMcpInput,
} from "./adapters";

export {
  canonicalToLegacy,
  canonicalArrayToLegacy,
  toolCallBlockToLegacy,
} from "./adapters";
