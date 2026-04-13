# AGX Schema Quick Reference — Agent Definitions

## Design Philosophy

The `agx_` system is **design-time only**. It defines *what* an agent is — prompts, tools, settings, model. The moment a user starts a chat, the agent config is captured into `cx_conversation` + `cx_user_request` and **all runtime execution lives purely in the cx_ system**. The agx_ tables are never read during the agentic loop.

```
agx_agent (definition)
  → user starts chat →
    cx_conversation.initial_agent_id + initial_agent_version_id (snapshot ref)
    cx_user_request.agent_id + agent_version_id (per-call ref)
    cx_message.agent_id (which agent produced this message)
  → from here, cx_ system owns the entire execution lifecycle
```

## Core Tables

### agx_agent
The full agent definition. Everything needed to configure an LLM call chain.

| Key Column | Notes |
|---|---|
| `agent_type` | user, system, builtin, etc. (default: `'user'`) |
| `name` / `description` | display info |
| **Prompt Config** | |
| `messages` (jsonb[]) | ordered prompt template — system, user, assistant turns |
| `variable_definitions` (jsonb) | template variables with types, defaults, validation |
| **Model Config** | |
| `model_id` → `ai_model.id` | default model |
| `model_tiers` (jsonb) | tiered model selection (e.g. fast/balanced/powerful) |
| `settings` (jsonb) | temperature, max_tokens, top_p, etc. |
| `output_schema` (jsonb) | structured output / JSON mode schema |
| **Tool Config** | |
| `tools` (uuid[]) | refs to `tools.id` — registered tool definitions |
| `custom_tools` (jsonb[]) | inline tool definitions (not in tools registry) |
| `mcp_servers` (uuid[]) | refs to `mcp_servers.id` — attached MCP servers |
| **Context Config** | |
| `context_slots` (jsonb[]) | what types of context this agent can receive (docs, selections, etc.) |
| **Scope & Ownership** | |
| `user_id` | creator (null for system agents) |
| `organization_id` → `organizations.id` | scope |
| `project_id` → `ctx_projects.id` | scope |
| `task_id` → `ctx_tasks.id` | scope |
| **Lineage** | |
| `source_agent_id` → self | cloned/forked from |
| `source_snapshot_at` | when the source was snapshotted |
| `version` (int) | current version counter (increments on save) |
| **State Flags** | |
| `is_active` / `is_public` / `is_archived` / `is_favorite` | visibility & lifecycle |
| `category` / `tags` (text[]) | organization & discovery |

### agx_version
Append-only snapshot history. Every meaningful edit to an agent writes a version row.

| Key Column | Notes |
|---|---|
| `agent_id` → `agx_agent.id` | **parent** |
| `version_number` (int) | sequential, matches agent's `version` at time of save |
| `change_note` | what changed |
| `changed_at` | when |
| *All agent fields* | Full snapshot: `messages`, `settings`, `tools`, `model_id`, `context_slots`, `mcp_servers`, etc. — all nullable (captures only what existed at that point) |

### agx_shortcut
UI-level quick actions that bind an agent to a triggerable shortcut in Matrx apps.

| Key Column | Notes |
|---|---|
| `agent_id` → `agx_agent.id` | which agent to execute |
| `agent_version_id` → `agx_version.id` | optionally pin to a specific version |
| `use_latest` (bool) | if true, always use agent's current state (ignores version pin) |
| `category_id` → `shortcut_categories.id` | UI grouping (placement_type, label, icon, color) |
| **Execution Behavior** | |
| `auto_run` | execute immediately on trigger (no confirm) |
| `allow_chat` | can user continue chatting after execution |
| `apply_variables` | resolve template variables before execution |
| `show_variables` | show variable form to user before running |
| `use_pre_execution_input` | prompt user for input before agent runs |
| `result_display` | modal-full, modal-compact, inline, toast, etc. |
| **UI Config** | |
| `label` / `description` / `icon_name` | display |
| `keyboard_shortcut` | hotkey binding |
| `sort_order` | position within category |
| `enabled_contexts` (jsonb) | where this shortcut appears (general, editor, etc.) |
| `scope_mappings` (jsonb) | dynamic scope resolution |
| **Scope & Ownership** | |
| `user_id` / `organization_id` / `project_id` / `task_id` | standard scope chain |

### agx_agent_templates
Curated starter agents. Same schema shape as `agx_agent` — used as blueprints.

| Key Column | Notes |
|---|---|
| *Same core fields as agx_agent* | `messages`, `settings`, `tools`, `custom_tools`, `context_slots`, `mcp_servers`, `model_id`, `model_tiers`, `output_schema`, `variable_definitions` |
| `source_agent_id` → `agx_agent.id` | which agent this template was created from |
| `is_featured` / `use_count` | discovery & popularity |
| `is_public` / `is_archived` | lifecycle |
| `category` / `tags` (text[]) | organization |
| `user_id` / `organization_id` / `project_id` / `task_id` | scope |

## Relationship Map

```
agx_agent (definition)
 ├── agx_version[]              (append-only snapshots)
 ├── agx_shortcut[]             (UI quick actions)
 │    └── shortcut_categories   (UI grouping)
 ├── agx_agent_templates[]      (blueprints sourced from agents)
 ├── tools.id[]                 (via uuid[] column, no FK constraint)
 └── mcp_servers.id[]           (via uuid[] column, no FK constraint)
```

## AGX → CX Bridge

This is the critical handoff. The agx_ system **defines**, the cx_ system **executes**.

| cx_ Table | agx_ Reference | Purpose |
|---|---|---|
| `cx_conversation.initial_agent_id` → `agx_agent.id` | Records which agent definition started this conversation |
| `cx_conversation.initial_agent_version_id` → `agx_version.id` | Pins the exact version used at conversation creation |
| `cx_user_request.agent_id` → `agx_agent.id` | Which agent handled this specific API call (can differ per-request) |
| `cx_user_request.agent_version_id` → `agx_version.id` | Exact version used for this call |
| `cx_message.agent_id` → `agx_agent.id` | Which agent produced this specific message |

**Key insight**: A conversation can start with one agent and switch to another mid-conversation. `cx_conversation` records the *initial* agent; `cx_user_request` and `cx_message` record the *actual* agent per-call and per-message.

## Key Patterns

- **Design-time vs runtime split**: agx_ is never queried during the agentic loop. Agent config is resolved once at request start, then cx_ owns everything.
- **Version pinning**: Shortcuts and conversations can pin to a specific `agx_version`, or use `use_latest` to always resolve the current agent state.
- **Array refs without FK constraints**: `tools` (uuid[]) and `mcp_servers` (uuid[]) reference `tools.id` and `mcp_servers.id` respectively, but use Postgres arrays rather than junction tables. No FK enforcement — resolved at runtime.
- **Template → Agent → Version lifecycle**: Templates bootstrap agents, agents accumulate versions, shortcuts expose agents to users.
- **Shared scope pattern**: `user_id` / `organization_id` / `project_id` / `task_id` appears on agents, shortcuts, and templates — same `ctx_` scope system used everywhere.
- **JSONB-heavy config**: `messages`, `settings`, `variable_definitions`, `context_slots`, `custom_tools`, `model_tiers`, `output_schema` — all jsonb. Schema flexibility at the cost of DB-level validation.
