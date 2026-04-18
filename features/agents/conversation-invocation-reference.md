# `ConversationInvocation` — Field Reference

Everything a caller needs to pass when invoking an agent, shortcut, or manual prompt in AI Matrx. Organized by group to match the shape of the type.

For each field: **type**, **default**, and a plain-English description of what it does and when you'd actually set it.

---

## Final shape (at a glance)

```ts
interface ConversationInvocation {
  identity:  { conversationId?; surfaceKey }
  engine:    { kind; agentId?; isVersion?; shortcutId?; manual? }
  routing:   { conversationMode; reuseConversationId? }
  origin:    { origin; sourceApp?; sourceFeature; isEphemeral? }
  inputs:    { variables?; userInput?; overrides? }
  scope:     { applicationScope? }
  relation:  { parentConversationId?; forkedFromId?; forkedAtPosition? }
  display:   { ...presentation flags... }
  behavior:  { allowChat?; autoRun?; usePreExecutionInput?; jsonExtraction? }
  callbacks: { groupId?; originalText? }
  builder:   BuilderAdvancedSettings | null
  metadata?: Record<string, unknown>
}
```

---

## 1. `identity`

Who this invocation is and where it's coming from.

| Field | Type | Default | What it does |
|---|---|---|---|
| `conversationId` | `string?` | `undefined` | If present, this is a **continuing** conversation — request goes to `conversations/{id}`. If absent, it's a **first turn** — request goes to `agents/{id}`. |
| `surfaceKey` | `string` (required) | — | Identifies **which surface is making the call** (code editor, Notes, a specific user-built app, etc.). The system uses this to know which UI context contract applies — i.e., which universal + surface-specific keys the caller is providing. |

---

## 2. `engine`

**The brain of the operation** — the source of the execution logic. What's actually driving this invocation? A stored agent definition, a stored shortcut, or a raw object passed in directly?

*Independent of `routing.conversationMode`, which is about the API call shape.*

| Field | Type | Default | What it does |
|---|---|---|---|
| `kind` | `"agent" \| "shortcut" \| "manual"` | — | Where the execution logic comes from. **agent** = resolve from a stored agent definition. **shortcut** = resolve from a stored shortcut (which pins a specific agent version + bindings). **manual** = the logic object is passed in directly, not looked up. |
| `agentId` | `string?` | `undefined` | The agent to run, when `kind === "agent"` or `"shortcut"`. |
| `isVersion` | `boolean?` | `false` | When `true`, `agentId` is interpreted as a specific version ID rather than a pointer to the current version. **Shortcuts and Apps must always set this `true`** — they only work with pinned versions to prevent drift. Chat/Runner default to `false` (current pointer). Terminology matches the server API. |
| `shortcutId` | `string?` | `undefined` | Which shortcut triggered this, when `kind === "shortcut"`. |
| `manual.label` | `string?` | `undefined` | Display label for a manual invocation (no agent definition to pull one from). |
| `manual.baseSettings` | `Partial<LLMParams>?` | `undefined` | Model params for a manual invocation. |

---

## 3. `routing`

The **API call mode** — a different question from `engine.kind`.

`engine.kind` = *where the logic comes from*. `routing.conversationMode` = *which API call shape to use*.

| Field | Type | Default | What it does |
|---|---|---|---|
| `conversationMode` | `"agent" \| "manual"` | — | Selects the API path/behavior. **agent** = full harness API (`agents/{id}` → `conversations/{id}`), with variable filling, context slots, tool registration, all managed machinery. **manual** = raw prompt-style API (`prompts` endpoint) — what the Builder uses. |
| `reuseConversationId` | `boolean?` | `false` | **Only meaningful when `conversationMode === "manual"` and `display.autoClearConversation === false`.** A Builder-mode tool for engineers iterating on a prompt chain. `true` → the next call sends the *same* `conversationId` and the server **replaces** the previous conversation (one DB row; engineer overwrites their last try). `false` → the next call generates a *new* `conversationId` and the previous chain stays in the DB untouched (two DB rows; engineer keeps the old chain and branches). In `agent` mode this flag has no effect — the conversationId is always reused. |

---

## 4. `origin`

Where the invocation is coming from *inside the product*. Used for logging, analytics, and the `source_app` / `source_feature` columns stamped onto `cx_conversation`.

| Field | Type | Default | What it does |
|---|---|---|---|
| `origin` | `InstanceOrigin` (required) | — | Typed enum of **trigger source**: `"manual"` (user opened a runner/chat surface and typed), `"shortcut"` (triggered by a Shortcut), `"test"` (parallel testing harness), `"sub-agent"` (spawned by a parent request). Independent of `engine.kind` — a sub-agent can come from any engine type. |
| `sourceApp` | `string?` | `undefined` | Which AI Matrx app initiated this (e.g., `"flashcard-generator"`, `"quiz-app"`). |
| `sourceFeature` | `SourceFeature` (required) | — | Which feature *within* the source app (e.g., `"missed-questions-study-aids"`). Typed enum. |
| `isEphemeral` | `boolean?` | **❓ — needs definition** | New field. I don't know what this gates yet. |

---

## 5. `inputs`

What the caller is actually providing for this turn.

| Field | Type | Default | What it does |
|---|---|---|---|
| `variables` | `Record<string, unknown>?` | `undefined` | Values for the agent's declared variables. Keyed by variable name. |
| `userInput` | `string?` | `undefined` | Optional free-text message. On first turn this is the opening message; on subsequent turns it's the new message. Can be absent when a shortcut is fully variable-driven. |
| `overrides` | `Partial<LLMParams>?` | `undefined` | Caller-supplied overrides of model settings. Only applied for settings the agent's engineer has marked as overridable. (The permission mechanism itself is a future concern — today the system already ensures invalid settings can't reach the model.) |

---

## 6. `scope`

The active org/project/task scope context for this invocation.

| Field | Type | Default | What it does |
|---|---|---|---|
| `applicationScope` | `ApplicationScope?` | `undefined` | The scope context (org / project / task) the invocation inherits. Stamped onto `cx_conversation.organization_id` / `project_id` / `task_id`, and surfaced to **context resolvers** so context slots can pull org-scoped data. Read at invocation time from `appContextSlice`. Type lives at `features/agents/utils/scope-mapping`. |

---

## 7. `relation`

How this conversation is linked to *other* conversations. These fields map directly to columns on `cx_conversation`.

> **Quick aside on the AI Matrx fork model:** forking doesn't create a shared-data branch. The server duplicates the source conversation + all its messages up to the fork point into a brand-new, fully independent conversation, then stamps a reference so we remember where it came from. Each message in the fork is a standalone row; nothing is shared. `parentConversationId` is a *different* relationship — it's for nested / sub-conversations, not forks.

| Field | Type | Default | What it does |
|---|---|---|---|
| `parentConversationId` | `string?` | `undefined` | Links this conversation to a parent — for sub-agent calls, nested conversations, or other cases where one conversation spawns another. Maps to `cx_conversation.parent_conversation_id`. |
| `forkedFromId` | `string?` | `undefined` | The conversation this one was forked from. Maps to `cx_conversation.forked_from_id`. |
| `forkedAtPosition` | `number?` (smallint) | `undefined` | The message position in the source conversation where the fork branched off. Maps to `cx_conversation.forked_at_position`. |

---

## 8. `display`

How the invocation is rendered. This is the largest group because it's where most user-experience customization for shortcuts lives.

| Field | Type | Default | What it does |
|---|---|---|---|
| `displayMode` | `ResultDisplayMode?` | caller-defined | One of 13 presentation styles — where/how the result shows up. Values: `inline`, `sidebar`, `modal-full`, `modal-compact`, `chat-bubble`, `flexible-panel`, `panel`, `toast`, `floating-chat`, `chat-collapsible`, `chat-assistant`, `background`, `direct` *(caller manages the UI itself)*. |
| `variableInputStyle` | `VariableInputStyle?` | varies by display mode | One of 6 layouts for variable collection: `inline`, `wizard`, `form`, `compact`, `guided`, `cards`. Layers on top of most `displayMode`s; unsupported combinations fall back to a default. |
| `showVariablePanel` | `boolean?` | `false` | Whether to **show the variable inputs to the user** — regardless of whether those values came from the user or were programmatically supplied by a shortcut. Set `true` when you want the user to see (and potentially edit) what's being sent. |
| `showDefinitionMessages` | `boolean?` | `true` | Whether messages baked into the agent definition (the ones containing variable placeholders) are **shown at all** in the transcript. Set `false` for shortcuts where you want the user to see only their own message (e.g., "I'm confused") rather than the full injected payload. |
| `showDefinitionMessageContent` | `boolean?` | `false` | Only relevant when `showDefinitionMessages` is `true`. If `true`, show the **fully rendered** message (all variables substituted). If `false`, show only the parts the user actually typed and hide the programmatically-injected content. |
| `showSubAgents` | `boolean?` | **❓ — needs definition** | New flag related to sub-agent display. I don't know the exact semantics yet. |
| `hideReasoning` | `boolean?` | `false` | Hide the model's reasoning/thinking output mid-run. |
| `hideToolResults` | `boolean?` | `false` | Hide raw tool-call results from the transcript. Useful when tool output is noisy and the final summary is what the user actually wants to see. |
| `showAutoClearToggle` | `boolean?` | `false` | Whether to expose the auto-clear toggle in the UI so the user can flip it themselves. |
| `autoClearConversation` | `boolean?` | `false` | When `true`, the conversation clears after each turn — there can never be more than one turn. The next user input (or variable change) starts the agent over from scratch. **Especially useful for Agent Engineers in the Builder**, where every invocation should be a clean-slate test. |
| `preExecutionMessage` | `string \| null` | `null` | Message shown to the user before firing, when `behavior.usePreExecutionInput` is `true`. Gives them a chance to read, edit, or confirm before the agent actually runs. |

---

## 9. `behavior`

How the conversation runs. **`allowChat`, `autoRun`, and `usePreExecutionInput` are independent — each answers a different question.**

| Field | Type | Default | What it does |
|---|---|---|---|
| `allowChat` | `boolean?` | `true` | **Can the user keep talking after the first turn?** This is the multi-turn switch. `true` = conversation; `false` = one turn and done. |
| `autoRun` | `boolean?` | `false` | **Should the invocation fire immediately, skipping the variable-entry UI?** `true` = no chance to fill variables or type anything — runs with whatever's already bound (from the shortcut, from defaults) and the user sees the response. `false` = show variable inputs first. |
| `usePreExecutionInput` | `boolean?` | `false` | **Only meaningful when `autoRun: true`.** Inserts a lightweight optional gate — a chance for a partial user input between firing and response. Nonsensical without `autoRun` (the user already entered variables; asking for more after would be out of order). Pairs with `display.preExecutionMessage`. |
| `jsonExtraction` | `JsonExtractionConfig?` | `undefined` | Streaming JSON extraction config — for agents that produce structured output that should be parsed incrementally as it streams, rather than waiting for full completion. |

### The four meaningful UX patterns `autoRun` × `allowChat` produces

| `autoRun` | `allowChat` | Resulting UX |
|---|---|---|
| `false` | `true` | **Standard chat** — user fills variables + input, fires, keeps talking. (Chat page.) |
| `false` | `false` | **Form** — user fills variables + input, fires once, done. |
| `true` | `true` | **Multi-turn shortcut** — click fires immediately, user can chat with the result. |
| `true` | `false` | **Pure shortcut** — click, see result, end. The "I'm Confused" pattern. |

---

## 10. `callbacks`

Callback wiring. Function references never live on the invocation itself — they're registered separately via `CallbackManager`, and the invocation just carries the key to look them up (plus any raw payload the callbacks need).

| Field | Type | Default | What it does |
|---|---|---|---|
| `groupId` | `string?` | `undefined` | Key into `CallbackManager`. The manager holds the actual function refs (`onComplete`, `onTextReplace`, `onTextInsertBefore`, `onTextInsertAfter`). Separating them this way keeps the invocation serializable. |
| `originalText` | `string?` | `undefined` | Original text payload for text-manipulation callbacks (e.g., translate-selection, replace-selection shortcuts). The selection the user had highlighted before the shortcut fired. |

---

## 11. `builder`

Advanced settings specific to Builder-mode invocations.

| Field | Type | Default | What it does |
|---|---|---|---|
| `builder` | `BuilderAdvancedSettings \| null` | `null` | Populated only when `routing.conversationMode === "manual"`. Holds Builder-specific advanced settings. |

---

## 12. `metadata`

Open escape hatch for future or experimental fields that don't warrant a dedicated group yet.

| Field | Type | Default | What it does |
|---|---|---|---|
| `metadata` | `Record<string, unknown>?` | `undefined` | Free-form key-value bag. Use sparingly — anything that ends up here and becomes important should eventually graduate into a proper group. |

---

# What got dropped (and why)

Three fields were previously hanging around on the invocation that shouldn't have been:

- **`showVariables`** — was derived state (a yes/no question computed from `agent has variables` × `showVariablePanel` × `isFirstTurn` × `autoRun`). Now handled as a selector; removed from the invocation type entirely.
- **`ready`** — dropped entirely.
- **`hiddenMessageCount`** — Builder-internal, not part of this contract.

`reuseConversationId` was almost dropped but survived in narrow form — it's a real mechanism, just Builder-scoped, and now properly lives under `routing`.

---

# Still-open questions (last round before final)

Only two things left before we can lock this.

1. **`origin.isEphemeral`** — new field I don't have a definition for. What does this gate? My guess: "don't persist this conversation to the DB" (fire-and-forget shortcuts, test runs). Confirm or correct.

2. **`display.showSubAgents`** — also new. I know sub-agents are now first-class with flat display, but I don't have the exact semantics. What does this flag control — whether sub-agent turns appear in the transcript? Whether their reasoning is visible? Both?

---

*Answer these two and this is locked.*
