# FEATURE.md — `agent-context` + `brokers`

**Status:** `active` (brokers is production) / `migrating` (agent-context scope system mid-build — see `agent-context/scope_system_execution_plan.md`)
**Tier:** `1` — foundational for every agent invocation
**Last updated:** `2026-04-22`

> Combined doc: **brokers** (hierarchical variable/scope resolver) and **agent-context** (its consumer that auto-fills agent context slots at invocation time). These two cannot be understood separately.

---

## Purpose

- **Brokers** (`features/brokers/`): a 9-level scope hierarchy (global → user → org → workspace → project → task → AI run → AI task) for variable resolution and context injection. SQL-backed. Nearest scope wins.
- **Agent context** (`features/agent-context/`): consumes broker values (and other ambient sources) to auto-fill declared **context slots** on an agent at invocation time. Never blocks on missing context.

---

## The core distinction — variables vs context slots

> **Variables are things that would leave the agent confused if missing. Context slots are things the agent can use to do an even better job.**

- **Variables** — named, declared inputs the agent **requires**. Each has a default UI component + help text (defined in Builder). Bound by name from `invocation.inputs.variables`.
- **Context slots** — named, declared inputs **auto-filled** from ambient sources (user profile, org settings, active project, scope presets, conversation history, selection). Absence is graceful.
- **Everything else** — ambient data the agent hasn't declared a slot for — is still reachable via **tool call**, not injection. The agent pulls what it needs.

---

## The 9-level scope hierarchy (brokers)

| Level | Scope | Example broker key |
|---|---|---|
| 1 | Global | default model, platform-wide feature flags |
| 2 | User | preferred model, language, display name |
| 3 | Organization | brand voice, safety policies, default tools |
| 4 | Workspace | multi-project grouping (nests inside org) |
| 5 | Project | domain glossary, project-specific prompts |
| 6 | Task | task-specific constraints |
| 7 | AI run | per-conversation overrides |
| 8 | AI task | fine-grained per-turn overrides |
| 9 | (resolution exits here) | — |

**Resolution rule:** a broker value declared at multiple levels resolves to the **nearest** (most specific) match. Falling through returns the next level up. Unresolved at all levels → undefined.

See [`features/brokers/INFO.md`](../brokers/INFO.md) for SQL schema, RPC functions, and concrete examples.

---

## Entry points

**Brokers** (`features/brokers/`)
- `services/` — broker resolution + mutation
- `hooks/` — React hooks for read/write
- `examples/` — patterns to copy when wiring a new broker
- `types/` — `Broker`, scope level enums, resolution result types

**Agent context** (`features/agent-context/`)
- `hooks/` — React hooks consuming brokers + resolving slots
- `services/` — slot fill logic
- `README.md` — user-facing guide
- `scope_system_execution_plan.md` / `TODO-URGENT-scope_system_team_instructions.md` — current migration state

**Scope plumbing**
- `features/agents/utils/scope-mapping.ts` — `ApplicationScope` type + resolver used by launch flow
- `lib/redux/slices/appContextSlice.ts` — global client scope state (`organizationId`, `workspaceId`, `projectId`, `taskId`)

---

## Data model

### `ApplicationScope`

```ts
interface ApplicationScope {
  selection?: string;
  content?: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}
```

Surface-level context that a resolver uses to fill variables and context slots. Lives at [`features/agents/utils/scope-mapping.ts`](../agents/utils/scope-mapping.ts).

### `appContext` (global)

Org / workspace / project / task IDs. Injected into every API call by `assembleRequest()`. Stamped onto `cx_conversation.organization_id / project_id / task_id` server-side.

### Variable vs slot definitions on an agent

Both are declared in the Builder and returned to clients on agent-load (no system prompt included). Variables are required; slots are optional auto-fills.

---

## Key flows

### Flow 1 — Broker resolution during invocation

1. Agent declares a context slot `org_brand_voice`.
2. At invocation, the agent-context service resolves it by walking the broker hierarchy starting at the most specific scope (AI task → … → global).
3. First hit wins. Value flows into `invocation.inputs.context.org_brand_voice`.

### Flow 2 — Scope-mapping resolution (UI context → agent)

1. A surface (code editor, notes, flashcard) builds a UI context object with keys like `selection`, `content`, `vsc_active_file_content`.
2. A Shortcut's `scopeMappings` maps those UI keys to the agent's variable / slot names.
3. The resolver:
   - Key matches a declared variable → fills the variable
   - Key matches a declared slot → fills the slot
   - Key matches nothing → surfaces as ad-hoc context the agent can reach via tool call

### Flow 3 — Active scope change (UI)

1. User switches projects in the app. `appContextSlice` updates.
2. Next agent invocation carries new `scope`. The server stamps the new scope on the conversation.
3. Broker lookups for this conversation now resolve from the new scope chain.

### Flow 4 — Graceful missing slot

1. Slot `user_profile_summary` declared by an agent.
2. Caller has no profile loaded; no broker hit at any level.
3. Slot resolves to `undefined`. Invocation proceeds.
4. Agent works with what it has (or fetches via tool call if it really needs it).

---

## Invariants & gotchas

- **Variables block; context slots don't.** Never gate invocation on a missing slot.
- **Nearest scope wins** in broker resolution. Be explicit about which scope level a new broker belongs to — setting it at the wrong level is silently wrong.
- **Broker values are read, not mutated, during invocation.** Writes happen through dedicated RPC paths.
- **`appContext` is the top-level client truth.** Keep it narrow — it rides on every API call.
- **Anything not declared as variable or slot** is reachable via tool call only, never injection.
- **Server stamps scope on the conversation** at first-turn time. Subsequent turns inherit.
- **Do not create per-feature scope state.** Use `appContext` + brokers — scattered scope state breaks the mental model.

---

## Related features

- **Foundational for:** `features/agents/` (every invocation uses this), `features/agent-shortcuts/` (scope mappings), `features/agent-apps/`
- **Cross-links:** [`features/brokers/INFO.md`](../brokers/INFO.md), [`features/scope-system/FEATURE.md`](../scope-system/FEATURE.md) (higher-level meta-doc), [`features/agents/agent-system-mental-model.md`](../agents/agent-system-mental-model.md) §2, [`features/projects/CONCEPT-scope-system-redux-architecture.md`](../projects/CONCEPT-scope-system-redux-architecture.md)

---

## Current work / migration state

Brokers is production. The agent-context scope-system build is in-flight; see `features/agent-context/scope_system_execution_plan.md` and `TODO-URGENT-scope_system_team_instructions.md`.

---

## Change log

- `2026-04-22` — claude: initial combined FEATURE.md for agent-context + brokers.

---

> **Keep-docs-live:** changes to scope levels, resolution rules, `ApplicationScope`, or the slot-fill contract must update this doc AND `features/scope-system/FEATURE.md` where they intersect.
