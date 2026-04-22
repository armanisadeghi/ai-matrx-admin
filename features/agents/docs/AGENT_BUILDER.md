# AGENT_BUILDER.md

**Status:** `active`
**Tier:** 1 (sub-feature of `features/agents/`)
**Last updated:** `2026-04-22`

> Read [`features/agents/FEATURE.md`](../FEATURE.md) first. This doc drills into the Builder surface specifically.

---

## Purpose

The Builder is the forge where engineers craft an agent's identity — instructions, model, settings, tools, variables, context slots, permissions. **It is the only surface that ships the full agent definition in the API payload.** Every other surface (Runner, Chat, Shortcut, App) sends only the agent ID and lets the server hydrate the definition from cache.

This payload difference is the Builder's reason to exist: it lets engineers test an agent exactly as it will run, with zero dependence on server cache state.

---

## Entry points

**Route**
- `app/(authenticated)/agents/[id]/build/page.tsx`

**API endpoint**
- `POST /prompts` — `apiEndpointMode: "manual"`

**Key thunks & selectors**
- Builder routes through the same unified `launchConversation` thunk — the Builder invocation sets `routing.apiEndpointMode = "manual"` and carries a full agent definition snapshot in `builder.*`
- `features/agents/redux/agent-definition/` — master definition slice with field-level undo and dirty tracking

---

## What gets tuned here

- System prompt / instructions (including `useStructuredSystemInstruction` + `structuredInstruction`)
- Model choice + settings (temperature, thinking budget, token limits)
- Tool access — which tools are exposed to the agent
- Variable definitions — name, default UI component, help text, required/optional
- Context slot definitions — name, source hints, whether the slot is exposed to consumers
- Permissions — whether consumers may see or override model settings
- Advanced settings (`BuilderAdvancedSettings`): `debug`, `store`, `maxIterations`, `maxRetriesPerIteration`

These advanced settings travel on `ConversationInvocation.builder` — they are Builder-only and do not apply to Runner / Chat.

---

## Why the Builder payload is different

Every other surface hands the server a minimal payload:

```
POST /ai/agents/{id}
{ variables, scope, overrides, userInput }
```

The Builder hands the server the **entire agent** inline:

```
POST /prompts
{
  // full agent definition snapshot — system prompt, model, settings, tools, variables,
  // context slots, permissions, advanced settings — nothing comes from server cache
  definition: {...},
  // plus the usual invocation inputs
  variables, scope, overrides, userInput
}
```

**Why:** The engineer is mid-edit. The "live" definition row may be dirty, not saved, or diverged from what's in server cache. Sending the full snapshot guarantees the server runs the exact bytes the engineer is staring at — no mystery, no caching layer, no cache invalidation race.

This is also why **Builder-specific settings** (`maxIterations`, `maxRetriesPerIteration`, `debug`, `store`) live in a dedicated `builder.*` sub-object on the invocation: they don't apply when an agent is consumed through normal surfaces.

---

## Key flows

### Flow 1 — Create / edit an agent definition

1. Engineer lands on `/agents/[id]/build` (or `/agents/new` for a fresh draft).
2. `agentDefinition` slice hydrates via `AgentHydrator` server components.
3. Engineer edits any field. Each edit dispatches a granular action → slice updates → `isDirty` set; undo stack pushes.
4. Save → thunk writes to Supabase → new version row created (see [`AGENT_VERSIONING.md`](./AGENT_VERSIONING.md)) → current pointer updated → `isDirty` cleared.

### Flow 2 — Manual test call

1. Engineer types a prompt in the Builder chat, optionally supplies variable values and scope.
2. `launchConversation` is dispatched with `routing.apiEndpointMode: "manual"` and `builder.*` settings attached.
3. Payload body is assembled with the **full definition** inline — not just the ID.
4. Fetch hits `POST /prompts`. Server validates the bundled definition and runs it.
5. Response streams back through the standard NDJSON pipeline (see [`STREAMING_SYSTEM.md`](./STREAMING_SYSTEM.md)).
6. Nothing is persisted unless `builder.store = true`.

### Flow 3 — Variable / context slot declaration

1. Engineer defines a variable `X` with default UI component `TextInput` and help text.
2. When any consumer surface loads this agent, the agent-load response includes variable + slot definitions — **but never system prompt or instructions**. Those are server-owned secrets.
3. Consumer surface renders the declared UI components; the user fills them in; values come back to the server via `invocation.inputs.variables`.

---

## Invariants & gotchas

- **The Builder is the ONLY surface that can send the full agent definition in the request body.** Runner is read-only on the agent — same runtime, but agent-id-only invocation.
- **Advanced settings live only on `builder.*`.** Putting `maxIterations` on a Runner invocation has no effect; those limits are enforced only in Builder mode.
- **Client never sees the system prompt.** Even in the Builder, the system prompt is sent from the client *to* the server — it is not echoed back on agent load for non-Builder surfaces.
- **Every save creates a new version.** There is no in-place overwrite. See `AGENT_VERSIONING.md`.
- **Dirty tracking is per-field.** An unsaved edit blocks navigation away; the undo stack is maintained per-field.
- **Agent Settings UI is part of Builder.** The `features/agent-settings/` directory contains scaffolding (not yet fully wired) for the advanced-settings surface. Extend it there, not in Builder components directly.

---

## Related

- [`AGENT_RUNNER.md`](./AGENT_RUNNER.md) — the sibling surface; read both together
- [`AGENT_VERSIONING.md`](./AGENT_VERSIONING.md) — what "save" does
- [`AGENT_INVOCATION_LIFECYCLE.md`](./AGENT_INVOCATION_LIFECYCLE.md) — endpoint routing contrasted against Runner
- `features/agent-settings/FEATURE.md` — *(to be written once wired)*

---

## Change log

- `2026-04-22` — claude: initial doc extracted from `agent-system-mental-model.md` §1 and related sources.

---

> **Keep-docs-live:** any change to the Builder payload shape, advanced settings enum, or `/prompts` contract must update this doc AND `AGENT_INVOCATION_LIFECYCLE.md`.
