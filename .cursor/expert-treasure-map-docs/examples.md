# Treasure Map — Examples

## Example 1: Real codebase — AI Routes

From `.treasure-maps/ai-routes-treasure-map.md`. Note the density.

```markdown
# AI Routes — Treasure Map

## What This Is
Three streaming AI routes sharing one execution stack. Routers resolve a
`UnifiedConfig` and populate `AppContext`; everything below `create_streaming_response`
is identical across all three.

## Entry Points
| Route | Config source | Conversation gate |
|-------|--------------|-------------------|
| `POST /ai/agents/{id}` | `agx.load_for_execution()` — DB | `resolve_conversation()` — create or verify |
| `POST /ai/chat` | `_build_unified_config()` — request body | `resolve_conversation()` — create or verify |
| `POST /ai/conversations/{id}` | `ConversationResolver.from_conversation_id()` — cache/DB | `verify_existing_conversation()` — 404 or pass |

## Core Flow
```
Router → create_streaming_response()
  → run_ai_task()              ← operation_id born and stored on AppContext here
      → execute_until_complete()   ← agentic while-loop; new cx_request per iteration
          → handle_tool_calls()
              → child_agent_context()   ← canonical sub-agent wrapper; all paths use this
                  → execute_ai_request()   ← recursive re-entry; shares parent request_id
```

## Key Relationships & Hidden Contracts
- `AppContext` is mutated in-place by `ctx.extend()` in the router *before*
  `create_streaming_response` — the executor reads it as a ContextVar,
  never passed as an argument.
- `fork_for_child_agent()` copies `request_id` unchanged — sub-agents share
  the parent's `cx_user_request` for cost rollup. Only `conversation_id`
  and `operation_id` change.
- `cx_request` rows are announced via `record_reserved` before the LLM
  call but not INSERTed until `_finalize_and_persist` — because
  `ai_model_id` (NOT NULL) is unknown until the API responds.
- `skip_persistence` (returned by `resolve_conversation`) gates both
  `ensure_user_request_exists` and all DB writes. The `/conversations`
  route has no skip path — it always persists.
- `child_agent_context()` in `matrx_connect/context/app_context.py` is
  the single canonical sub-agent lifecycle wrapper. All call sites import
  it; zero duplicates tolerated.

## Key Files
| File | Role |
|------|------|
| `matrx_connect/context/app_context.py` | `AppContext` dataclass, ContextVar, `child_agent_context` |
| `matrx_connect/streaming/response.py` | `create_streaming_response` — the infrastructure boundary |
| `aidream/api/core/ai_task.py` | `run_ai_task` — operation_id birth, executor handoff |
| `matrx_ai/orchestrator/executor.py` | Agentic loop, `cx_request` reservation, persistence |
| `matrx_ai/tools/agent_tool.py` | Sub-agent tool execution entry point |
| `matrx_ai/db/conversation_gate.py` | All conversation/user_request create/verify/ensure |
| `matrx_ai/agents/resolver.py` | Conversation state restore (the `/conversations` path) |
```

## Example 2: Too Verbose (What NOT to Do)

```markdown
# Chat System Documentation

## Overview
The chat system is a REST API built with FastAPI that allows users to
send messages and receive AI-generated responses. It uses Python 3.11
and follows standard async/await patterns...

## How Routes Work
In FastAPI, routes are defined using decorators like @app.post(). When
a request comes in, FastAPI validates the request body against a Pydantic
model. Our chat route accepts a JSON body with the following fields...

## Database
We use PostgreSQL to store conversations. Each conversation has an ID,
a user ID, and a list of messages. Messages have a role field that can
be "user" or "assistant"...
```

**Why this fails**: Every line describes something an expert already knows
or would see immediately in the code. Zero treasure, all shovels.

## Calibration Check

After writing a treasure map, score each line:

| Score | Meaning | Action |
|-------|---------|--------|
| 🗺️ | Non-obvious, saves real discovery time | Keep |
| 🔍 | Mildly helpful, findable in ~15 min | Cut unless very short |
| 📖 | Restates what code says | Cut immediately |

A good treasure map is 80%+ 🗺️ lines.