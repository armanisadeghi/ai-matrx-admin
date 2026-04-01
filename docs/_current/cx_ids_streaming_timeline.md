# CX table IDs: when the client sees them (chat / agent / conversation)

Scope: POST `/ai/chat`, POST `/ai/agents/{agent_id}`, POST `/ai/conversations/{conversation_id}` — all use `create_streaming_response()` + `run_ai_task()` + the same conversation gate and persistence.

---

## HTTP response headers (first bytes of the response)

Set on the `StreamingResponse` before the NDJSON body is consumed (`matrx_connect/streaming/response.py`).


| Header              | Value                        | Maps to              |
| ------------------- | ---------------------------- | -------------------- |
| `X-Conversation-ID` | `AppContext.conversation_id` | `cx_conversation.id` |
| `X-Request-ID`      | `AppContext.request_id`      | `cx_user_request.id` |


**Timing vs DB**

- Routers **await** `ensure_conversation_exists` and `ensure_user_request_exists` **before** returning `create_streaming_response`. On the success path, those rows usually **already exist** when the client reads headers.
- Both `ensure_*` calls are written to **log failures and not raise**; if an insert fails, the client can still get the same IDs in headers while the DB row is missing.

**ID provenance**

- **Chat:** `conversation_id` = body field or **new UUID** in the router.
- **Agent:** `conversation_id` = **new UUID** every start.
- **Continue:** `conversation_id` = path param (already known to the client).
- `**request_id`:** created in `AuthMiddleware` as `str(uuid.uuid4())` — this string is the primary key for `cx_user_request`.

---

## NDJSON stream — order of the first events

From `create_streaming_response` (`_stream` generator):

1. `**status_update`** — `status: connected`, initial message (`"Connecting..."` / `"Connecting to agent..."`).
2. `**data**` — nested payload with `event: conversation_id` and `conversation_id` (duplicate of the header for JSONL consumers).
3. Then whatever the background task emits (`run_ai_task` → executor → model chunks, tool events, etc.).

---

## Per-table: client exposure

### `cx_conversation`


| When on wire                           | How                                             |
| -------------------------------------- | ----------------------------------------------- |
| Immediately (headers + 2nd JSONL line) | `X-Conversation-ID` and `data.conversation_id`. |


Later, **optional:** background labeling may send another `**data`** envelope containing `**conversation_labeled**` (same `conversation_id`, plus title/description/keywords). That runs in a task scheduled at the **start** of `execute_until_complete` (before the main model loop); it can arrive **mid-stream**, **near completion**, or **after** most tokens depending on the labeling LLM. Implementation: `schedule_conversation_labeling` / `_run_labeling` → `emitter.send_data(ConversationLabeledPayload...)`.

### `cx_user_request`


| When on wire | How                                                                                   |
| ------------ | ------------------------------------------------------------------------------------- |
| Immediately  | `**X-Request-ID`** only. There is **no** dedicated JSONL event for `user_request_id`. |


The stream never echoes `cx_user_request.id` again unless you add it. It is the same UUID as `X-Request-ID`.

### `cx_message`


| When on wire | How                                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Not sent** | Message row UUIDs are created in `persist_completed_request` when the run **finishes** (batch insert of all messages for the turn). `CompletionPayload` does **not** include `message_ids`. |


Clients must **reload** via your REST CX routes (e.g. `cx_data`) or track content by position, not by DB id, during streaming.

### `cx_request` (per-iteration)


| When on wire | How                                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Not sent** | Rows are **inserted** during `persist_completed_request` after the run. No NDJSON event exposes `cx_request.id`. |


### `cx_tool_call`


| When on wire                       | How                                                                                                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool `**tool_event`** NDJSON lines | These carry `**call_id**` and `**tool_name**` — that `**call_id` is the model/tool-call id**, aligned with `cx_tool_call.call_id` and tool result payloads. |
| **Not sent**                       | Primary key `**cx_tool_call.id`** (`ToolExecutionLogger.log_started` generates a separate UUID for the row).                                                |


Row is **INSERTed** when the tool starts (before/at `"tool_started"`). `**message_id`** on the row is **backfilled after** `cx_message` rows are created for tool-role messages (persistence backfill).

### `cx_media` / `cx_artifact`


| When on wire                       | How                                                                                                                                                                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Not part of these three routes** | No `create_cx_media` / `cx_artifact` writes were found on the chat–agent–conversation AI path in this repo. If you add media/artifact persistence elsewhere, nothing in the shared streaming contract automatically exposes those UUIDs. |


---

## End of stream

1. `**completion`** — stats/output/finish metadata via `CompletionPayload`. **No** `cx_*` row ids beyond what is already implied above.
2. `**end`**.

Persistence runs **inside** `execute_ai_request` before this function returns, so `cx_message` / `cx_request` rows normally exist **before** `completion` is emitted — they are simply **not included in the payload**.

---

## Quick reference


| Table             | In headers           | Early `data` event      | During stream                   | In `completion` |
| ----------------- | -------------------- | ----------------------- | ------------------------------- | --------------- |
| `cx_conversation` | Yes                  | Yes (`conversation_id`) | Optional `conversation_labeled` | No              |
| `cx_user_request` | Yes (`X-Request-ID`) | No                      | No                              | No              |
| `cx_message`      | No                   | No                      | No                              | No              |
| `cx_request`      | No                   | No                      | No                              | No              |
| `cx_tool_call`    | No                   | No                      | `call_id` only (not row PK)     | No              |
| `cx_media`        | No                   | No                      | —                               | —               |


