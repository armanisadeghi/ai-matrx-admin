# CX Schema Quick Reference — Agents Route

## Call Flow

```
Client → POST /agents → creates cx_user_request
  → cx_user_request loops N iterations:
      each iteration → cx_request (1 LLM API call)
      each iteration → cx_message(s) (user/assistant/tool turns)
  → streams response back to client
```

All activity lives under a **cx_conversation** (long-lived, spans days/months).

## Core Tables & Relationships

### cx_conversation
The root container. One per user+agent chat thread.

| Key Column | Notes |
|---|---|
| `user_id` | owner (auth.users) |
| `initial_agent_id` → `agx_agent.id` | agent that started this convo |
| `initial_agent_version_id` → `agx_version.id` | pinned version |
| `last_model_id` → `ai_model.id` | most recent model used |
| `forked_from_id` → self | conversation forking |
| `parent_conversation_id` → self | sub-conversation support |
| `organization_id` → `organizations.id` | scope |
| `project_id` → `ctx_projects.id` | scope |
| `task_id` → `ctx_tasks.id` | scope |
| `config` (jsonb) | runtime overrides for this convo |
| `variables` (jsonb) | template variable values |
| `overrides` (jsonb) | per-convo setting overrides |
| `is_ephemeral` | if true, not persisted long-term |
| `message_count` | denormalized counter |
| `source_app` / `source_feature` | which Matrx app + feature initiated |

### cx_user_request
One per client API call. Tracks the full round-trip including all iterations.

| Key Column | Notes |
|---|---|
| `conversation_id` → `cx_conversation.id` | **required** |
| `user_id` | caller |
| `agent_id` → `agx_agent.id` | agent used for this request |
| `agent_version_id` → `agx_version.id` | version used |
| `iterations` | how many LLM loops (tool calls = more iterations) |
| `trigger_message_position` | which message position triggered this |
| `result_start_position` / `result_end_position` | message range produced |
| `total_input_tokens`, `total_output_tokens`, `total_cached_tokens`, `total_cost` | aggregated across all iterations |
| `total_duration_ms`, `api_duration_ms`, `tool_duration_ms` | timing breakdown |
| `status` | pending → complete / error |
| `finish_reason` | stop, tool_use, max_tokens, etc. |
| `source_app` / `source_feature` | origin tracking |

### cx_request
One per LLM API call. A user_request with 3 tool-call iterations = 3 cx_requests.

| Key Column | Notes |
|---|---|
| `user_request_id` → `cx_user_request.id` | **parent** |
| `conversation_id` → `cx_conversation.id` | denormalized for query speed |
| `ai_model_id` → `ai_model.id` | exact model used |
| `api_class` | provider identifier (openai, anthropic, google) |
| `iteration` | 1-indexed position in the loop |
| `input_tokens`, `output_tokens`, `cached_tokens`, `cost` | per-call metrics |
| `api_duration_ms`, `tool_duration_ms`, `total_duration_ms` | per-call timing |
| `tool_calls_count` | number of tools invoked |
| `tool_calls_details` (jsonb) | tool names, args, results |
| `response_id` | provider's response ID |
| `finish_reason` | why this call stopped |

### cx_message
Individual conversation turns. Ordered by `position` within a conversation.

| Key Column | Notes |
|---|---|
| `conversation_id` → `cx_conversation.id` | **parent** |
| `role` | user, assistant, tool, system |
| `position` (smallint) | order in conversation (0-indexed) |
| `content` (jsonb) | array of content blocks (text, tool_call, tool_result, etc.) |
| `user_content` (jsonb) | original user-facing content (before model transformations) |
| `content_history` (jsonb) | previous versions if edited/condensed |
| `source` | user, agent, system, tool |
| `agent_id` → `agx_agent.id` | which agent produced this message |
| `is_visible_to_user` | controls UI rendering |
| `is_visible_to_model` | controls what gets sent to LLM |

## Related Tables

### cx_artifact
Attached outputs (code, docs, generated content) linked to messages.

| Key Column | Notes |
|---|---|
| `message_id` → `cx_message.id` | **parent message** |
| `conversation_id` → `cx_conversation.id` | denormalized |
| `artifact_type` (enum) | code, document, image, etc. |
| `status` (enum) | draft, complete, error |
| `external_system` / `external_id` / `external_url` | for artifacts stored externally |

### cx_media
File/media storage for conversations.

| Key Column | Notes |
|---|---|
| `conversation_id` → `cx_conversation.id` | **parent** |
| `user_id` | uploader |
| `kind` | image, audio, video, file, etc. |
| `url` | public/signed URL |
| `file_uri` | internal storage path (S3) |
| `mime_type`, `file_size_bytes` | metadata |

### cx_agent_memory
Persistent memory across conversations. **No FKs to cx_ tables** — scoped independently.

| Key Column | Notes |
|---|---|
| `user_id` | memory owner |
| `memory_type` | fact, preference, instruction, etc. |
| `scope` / `scope_id` | user, agent, conversation, etc. |
| `key` | lookup key |
| `content` | the memory content |
| `importance` (float) | 0.0–1.0, default 0.5 |
| `access_count` / `last_accessed_at` | usage tracking for relevance decay |
| `expires_at` | optional TTL |

## Relationship Map

```
cx_conversation (root)
 ├── cx_user_request[]        (1 per client call)
 │    └── cx_request[]        (1 per LLM iteration)
 ├── cx_message[]             (ordered by position)
 │    └── cx_artifact[]       (attached outputs)
 ├── cx_media[]               (uploaded files)
 └── (cx_agent_memory)        (scoped independently, no direct FK)
```

## Key Patterns

- **Soft deletes everywhere**: `deleted_at` on all tables, never hard delete.
- **Position-based ordering**: Messages use `position` (smallint), not timestamps.
- **Dual visibility**: `is_visible_to_user` + `is_visible_to_model` on messages enables hidden system messages and model-only context.
- **Denormalized `conversation_id`**: Present on cx_request, cx_artifact, cx_media for direct queries without joins.
- **Source tracking**: `source_app` + `source_feature` on conversations and user_requests to trace which Matrx app originated the call.
- **All UUIDs**: Every `id` is `uuid DEFAULT gen_random_uuid()`.
- **JSONB config pattern**: `metadata`, `config`, `variables`, `overrides` — all `jsonb DEFAULT '{}'`.