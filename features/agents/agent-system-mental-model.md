# AI Matrx — Agent System Mental Model

> **Agents are autonomous AI specialists.** The AI Matrx Harness is what turns a raw model into one — and lets it be invoked through many surfaces, sometimes without the user saying a single word. A click can be enough. Chat is one surface among many, not the default.

### What the Harness provides

Every item below is included out of the box, and **every piece is toggleable, tunable, or fully customizable by the Agent Engineer in the Builder**:

- Persistent, engineered **context & memory**
- Safe, real-world **tool execution** and sandboxing
- Reliable **orchestration** and self-correction loops
- **State persistence** and observability for long-running tasks
- **Minimalism that scales** with the model — give a strong model less scaffolding; give a weak one more

The system runs in three stages — **Build → Test → Consume** — with three consumer surfaces.

---

## 1. Agent Builder — *the forge*

**Path:** `app/(a)/agents/[id]/build/page.tsx` · **Endpoint:** `prompts`

Where engineers craft an agent's identity: instructions, model, settings, tools, variables, and context slots. The interface is a manual chat that hits the `prompts` endpoint with raw API calls (similar in spirit to Anthropic / OpenAI / Google direct APIs, but Matrx-shaped). Every request stands alone and is fully editable — nothing is hidden, nothing is implicit. This is the only surface with that level of control.

**What gets tuned here:** system prompt, model, temperature, thinking budget, token limits, tool access, variable definitions, context slots, permissions (e.g., whether consumers may see or override model settings), and the **default UI component + help text for each variable** (used when Runner or Chat needs to render an input for it).

**Examples:**
- **Coding agent** — Opus-tier, max thinking, large token budget, tools for file read/write, patches, DB queries, shell. Trusted for depth; few guardrails.
- **Content structurer** — Haiku-tier, temp ~0.2, thinking off, no tools. Unstructured text → outline or table. Cheap, fast, deterministic.

### Versioning (critical)

**Every save in the Builder creates a new Agent Definition version.** The version table stores all versions; the "current" agent is a pointer to one of them.

- **Runner and Chat** default to the current version (Runner can pin any past version for testing).
- **Shortcuts and Apps** pin to a **specific version** and stay frozen on purpose — since they depend on the agent's variable structure, an unplanned change would break every place they're embedded. Drift is surfaced in the UI; the engineer can update on demand.

---

## 2. Variables vs. Context Slots

A core distinction the rest of the doc relies on.

> **Variables are things that would leave the agent confused if missing. Context slots are things the agent can use to do an even better job.**

**Variables** — named, declared inputs the agent *requires*. Each is defined in the Builder with a default UI component and help text. Bound **by name** from whatever the caller provides.

**Context slots** — named, declared inputs that are **auto-filled in the background** from ambient sources when available: user profile, organization settings, active project, scope presets, conversation history, selection, and so on. Their absence is graceful; they enhance, they don't block.

**Everything else in context** — ambient data the agent hasn't declared a slot for — is still reachable, but **via tool call** rather than injection. The agent pulls what it needs.

*Variables are required inputs. Context slots are optional auto-fills. Anything else is fetched on demand.*

---

## 3. Agent Runner — *the test track*

**Path:** `app/(a)/agents/[id]/run/page.tsx` · **Endpoints:** `agents/{id}` then `conversations/{id}`

Runner and Chat are **the same runtime** — Runner is just Chat with observability turned on and the agent marked read-only. It defaults to the current version, but any past version can be pinned for comparison.

**What engineers see that end users don't:** server-side logs, stream debugging, token counts and costs per turn, tool invocations and their results, raw model settings in effect.

**Example:** Engineer loads the Tutor agent, sets `learner_level = 8th grade` and `subject_context = photosynthesis`, and fires the same agent through ten scenario variants to find where it breaks. The agent's guts don't move; the inputs do.

---

## 4. Chat — *the conversational surface*

**Path (coming soon):** `app/(a)/chat/...` · **Endpoints:** `agents/{id}` then `conversations/{id}`

Where users converse with any agent they have access to. Identical runtime to Runner, minus the debugging. (Sharing and visibility are handled by the existing AI Matrx sharing system — out of scope here.)

### The request lifecycle (this is how Runner and Chat both work)

**First request** → `POST agents/{id}`
Client sends: variable values, context, and an optional opening message. That's the entire payload. The client **never sees** the agent's instructions, system prompt, model choice, or internals — those are the engineer's secrets, owned by the server. What the client *does* get back when loading an agent is the list of variable and context slots it needs to fill, with their default UI components and help text. (The engineer may opt to expose model choice and settings for override, but that is a deliberate permission, not the default.)

**Every request after** → `POST conversations/{id}`
Client sends: the new message, plus any permitted setting overrides. Nothing else. The server holds history, state, tool results, and everything else.

### The conceptual shift

Once the first request completes, **there is no longer an "agent" in play — there is an *agent conversation*.** An agent conversation is a live instance of the agent that evolves through messages and tool calls. You don't re-send instructions. You don't re-send history. You add to a running entity that the server fully owns.

---

## 5. Agent Shortcuts — *invocation without conversation*

**Coming soon.** Replaces the Unified Context Menu and similar surfaces.

A Shortcut is a first-class stored entity that wraps a specific agent definition version and **auto-maps variables from the surrounding UI context**. Most Shortcuts eliminate user input entirely — the user clicks, variables get wired in from what's already on screen, and the agent runs.

- **Agents have no awareness of Shortcuts.** A Shortcut is a wrapper; the agent sees a normal invocation with variables already filled.
- Shortcut records live in their own table, pointing to `(agent_definition_version, label, category, placement rules, display config)`. They can also store React code for fully custom rendering — Shortcuts can ship UI, not just bindings.
- A Shortcut can also be configured to **trigger a Workflow** rather than a single agent (Workflows are out of scope for this doc).

### How variables get bound: the UI context contract

Every surface that hosts Shortcuts — code editor, Notes, Agent Builder, user-built apps — exposes a **UI context object**. The Shortcut maps agent variables to keys on this object. The surface author decides what those keys contain.

**Universal keys** (available on every surface):

| Key | Meaning |
|---|---|
| `selection` | Currently highlighted content |
| `textBefore` / `textAfter` | Text surrounding the selection or cursor |
| `content` | The primary payload of the current view (surface decides) |
| `context` | Broader situational context (surface decides) |
| `appFeature` | Which feature within the app the user is in |
| `featureAgentOverview` | Description of the current feature's purpose (for the agent) |
| `user_overview` | Normalized summary of the user |

**Surface-specific extensions** layer on top. The coding surface, for example, adds:

| Variable | Source | Content |
|---|---|---|
| `vsc_active_file_path` | `active_file.path` | Full path of the open file |
| `vsc_active_file_content` | `active_file.content` | Full text content |
| `vsc_active_file_language` | `active_file.language` | Language identifier (`python`, etc.) |
| `vsc_selected_text` | `selected_text` | Currently highlighted text |
| `vsc_diagnostics` | `diagnostics[]` | Formatted errors/warnings |
| `vsc_workspace_name` / `vsc_workspace_folders` | `workspace.*` | Workspace metadata |
| `vsc_git_branch` / `vsc_git_status` | `git.*` | Git state |

When a user builds their own app, they define the same kind of mapping — or the in-app AI agent writes it for them.

### The pattern that makes this powerful: `enableShortcuts` on components

The Card component is the clearest illustration. A Card has a title and a description — structured, meaningful content by construction. Flip one flag — `enableShortcuts` — and every card in the app instantly gains a context menu with **Search Web**, **Explain**, **Fact Check**, **Translate**, and whatever else is wired up.

Because the Card already *is* structured content, the binding is trivial — `content` maps to the card's body, `context` to its title. Cards look identical everywhere; the moment the flag is on, the full shortcut menu is reachable. The user sees three categories side by side:

1. **System shortcuts** — built-in across the platform.
2. **Organization shortcuts** — added by their company.
3. **Personal shortcuts** — ones they created themselves.

All three backed by fully custom agents, tools, and UI.

### Customizing a Shortcut's behavior

Shortcuts are highly configurable. Two key config axes:

**`displayMode`** — how the result is presented. One of 13:

> `inline` · `sidebar` · `modal-full` · `modal-compact` · `chat-bubble` · `flexible-panel` · `panel` · `toast` · `floating-chat` · `chat-collapsible` · `chat-assistant` · `background` · `direct` *(caller manages the UI)*

**`variableInputStyle`** — how variables are collected from the user when input is needed. One of 6 layouts (stepper, form, stacked collapsibles, etc.).

Other flags that reshape the experience:

| Flag | What it controls |
|---|---|
| `autoRun` | `true` = fire immediately, skipping variable entry; `false` = show variable inputs first |
| `allowChat` | `true` = user can keep talking after the first turn (multi-turn); `false` = one turn and done |
| `usePreExecutionInput` | With `autoRun`, still give the user a chance to edit or confirm before firing (optional `preExecutionMessage`) |
| `showVariablesPanel` | Let the user see and modify auto-bound variable values |
| `showDefinitionMessages` | Expose non-system messages baked into the agent definition (see example below) |
| `hideReasoning` / `hideToolResults` | Clean up what the user sees mid-run |

### One example that shows the full mechanism

**Agent:** Tutor agent with variables —
- `focus` — what the learner is working on right now
- `subject_context` — what they're studying (course, chapter, topic)
- `action` — one of: explain, go deeper, simplify, find evidence, give example
- `learner_name`, `learner_level`

**Shortcut:** "I'm Confused" button inside a flashcard module. Learner clicks it. Nothing else.

| Agent variable | UI context source |
|---|---|
| `focus` | current flashcard (front + back) |
| `subject_context` | last 5 flashcards in this session |
| `action` | `"explain"` (fixed by the Shortcut) |
| `learner_name` | user profile |
| `learner_level` | user preferences |

With `showDefinitionMessages: false`, the learner sees their first message as simply `"I'm confused"` — not the full payload of flashcard content the Shortcut actually injected. Flip it to `true` and the learner sees everything passed in. Same agent, same invocation, radically different feel.

---

## 6. Agent Apps — *purpose-built experiences*

**Coming soon.**

An App is a custom UI for a specific workflow. Where a **Shortcut auto-fills** variables, an **App provides a different way to supply them** — often one that doesn't look like AI at all. No chat box. Sometimes no model output in chat form at all — the agent's result is rendered as an **artifact** directly into the UI.

> **On artifacts:** AI Matrx artifacts are **bidirectionally interactive**. The model produces a structured output (task list, flashcard set, form, widget); the UI renders it as a real, usable component; the user's interactions with it (checking a task off, reordering cards, editing a field) are passed back to the model on the next turn. Model-authored artifacts can also sync with real application state — a generated task list can become actual tasks in the app. This is a significant departure from the one-way artifacts most providers offer.

**Three ways to create an App:**
1. **Start from a template** — a library of standard scaffolds the user can customize.
2. **Describe your vision** — the in-app AI agent builds the App for you.
3. **Build fully custom** — as long as the App stays within the structural rules of the framework.

Apps can contain Shortcuts. Shortcuts inside an App can invoke agents from *other* Apps. This composition is where the model gets powerful.

### The example that demonstrates the whole picture

**Flashcard Generator App.** You land on a page. Enter topic, grade level, card count. Click generate. You receive a full flashcard interface — rendered as an artifact by the Flashcard Generator agent. To you, this is a flashcard website. There's no chat. You may not even realize an AI was involved.

**Inside that flashcard interface** lives the "I'm Confused" Shortcut from above, invoking the Tutor agent when you get stuck on a card.

**Also inside:** a "Make Me a Quiz" Shortcut that invokes the Quiz Maker agent with topic and cards auto-passed. You take the quiz inside the Quiz App (another App).

**Inside the Quiz App,** when you miss questions, a "Missed Question Study Aids" feature appears. One option: "Make Flashcards." That Shortcut invokes the Flashcard Generator agent — the same one that started the chain — feeding it the missed topics and your profile.

You've used three agents (Flashcard Generator, Tutor, Quiz Maker) across two Apps, connected by Shortcuts, and never once typed a prompt or opened a chat window. **That's the model.**

---

## The full picture

```
        BUILD                  TEST                     CONSUME
   ┌─────────────┐      ┌──────────────┐      ┌───────────────────────┐
   │   Builder   │  →   │    Runner    │  →   │ Chat | Shortcut | App │
   │  prompts    │      │   agents +   │      │       agents +        │
   │    API      │      │ conversations│      │     conversations     │
   └─────────────┘      └──────────────┘      └───────────────────────┘
         │                     │                         │
    every save            read-only,              pin a specific
    creates a           version-pinnable,       version — frozen
    new version         full observability     until engineer updates
```

- **Builder** defines the agent. Raw `prompts` endpoint, full control, secrets live here, every save = new version.
- **Runner ≡ Chat runtime.** Variables + context in, conversation out. Engineer's secrets stay server-side.
- **Chat, Shortcut, App** are three surfaces onto the same runtime, differing only in how variables get filled:
  - **Chat** — user types.
  - **Shortcut** — UI context auto-fills; invocation is highly configurable (13 display modes, 6 input styles, auto-fire or show-inputs-first, multi-turn or single-turn, etc.).
  - **App** — bespoke UI captures input, often with no chat at all; agent output renders as an interactive artifact.
