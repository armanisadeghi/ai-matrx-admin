# Public Chat Feature

Agent-powered chat for public routes (`/p/chat`). Communicates with the Python FastAPI backend via NDJSON streaming.

## Architecture

- **Types**: Auto-generated from Python Pydantic models at `types/python-generated/stream-events.ts`. No hand-written stream event types.
- **Stream Parsing**: Single shared parser at `lib/api/stream-parser.ts` — all NDJSON parsing goes through `parseNdjsonStream()`.
- **Tool Rendering**: Delegated to `features/tool-call-visualization` via the `ToolCallVisualization` shell. This feature converts the `ToolCallBlock` emitted by `lib/chat-protocol` into `ToolLifecycleEntry` (from `features/agents/types/request.types`) before passing it to the shell.
- **Cancellation**: Dual-path — client-side `AbortController` for immediate teardown + server-side `POST /api/ai/cancel/{request_id}` for graceful stop. Request ID comes from the `X-Request-ID` response header.

## Key Files

| File | Purpose |
|------|---------|
| `hooks/useAgentChat.ts` | Core hook — manages streaming, chunk accumulation, cancel, tool persistence |
| `components/ChatContainer.tsx` | Chat UI shell — message list, input, agent selection |
| `components/MessageDisplay.tsx` | Individual message rendering with tool call visualization |
| `context/ChatContext.tsx` | Shared state (messages, conversation, settings) |
| `types/content.ts` | Content item types for multimodal input |

## Stream Event Types

All event types come from the generated `StreamEvent` union. Handled events:

- `chunk` — `{ text: string }` accumulated into assistant message
- `status_update` — forwarded to UI status indicators
- `tool_event` — folded into `ToolCallBlock`s by `lib/chat-protocol/from-stream.ts`; converted to `ToolLifecycleEntry` at the call site and handed to `ToolCallVisualization`
- `completion` — final output and usage stats
- `heartbeat` — connection keepalive (no-op)
- `error` — displayed to user via `ErrorPayload.user_message`
- `end` — `{ reason: string }` signals stream termination
- `data`, `broker` — stored in stream events ref for downstream consumers

## No Legacy Support

Socket.IO types, `tool_update` events, `info` events, and `user_visible_message` are not used in this feature. All imports point to `types/python-generated/` or `lib/api/`.
