# FEATURE.md — `agent-connections`

**Status:** `scaffolded` (UI shell only — all data is hardcoded mock, no Redux/service/DB wiring)
**Tier:** `1`
**Last updated:** `2026-04-22`

> This is the agent-facing hub for "what can this agent reach?" — models, skills, instructions, prompts, hooks, MCP servers, plugins. It currently exists as a UI shell rendered in a floating window panel. Real data sources, CRUD, and auth storage are not yet wired. The broader MCP + external integrations story lives in the sibling feature `features/api-integrations/` (see forthcoming `features/api-integrations/FEATURE.md`).

---

## Purpose

Agent Connections is the engineer-facing registry surface that governs **which tools, skills, instructions, prompts, hooks, MCP servers, and plugins an agent can reach**. Today it is a presentational shell (sidebar + sectioned body) designed to slot into the agent workspace; the connection/auth data model and runtime resolution still belong to `features/api-integrations/` and `features/agents/services/mcp.service.ts`.

---

## Entry points

**Routes**
- No dedicated route. The spec mentions `/app/(authenticated)/ai/agents/[id]/connections`, but that path does not exist in this codebase. The agent route tree lives under `app/(a)/agents/[id]/...` (`build`, `run`, `apps`, `shortcuts`, `widgets`) and none of them mount this hub as a page today.
- Surfaced instead as a floating window: **`agent-connections-window`** (overlay id `agentConnectionsWindow`). Opened from the overlay controller and rendered via `features/window-panels/windows/agents/AgentConnectionsWindow.tsx`.

**Components (exported from `features/agent-connections/index.ts`)**
- `AgentConnectionsSidebar` — left-rail section picker (8 entries)
- `AgentConnectionsBody` — switch-based router for section content
- Per-section components in `components/sections/`: `OverviewSection`, `AgentsSection`, `SkillsSection`, `InstructionsSection`, `PromptsSection`, `HooksSection`, `McpServersSection`, `PluginsSection`
- Shared primitives: `SectionToolbar`, `GroupSection`, `ListRow`, `SectionFooter`

**Hooks / Services / Redux**
- **None.** No hooks, no `service.ts`, no slice. Active section is held in local `useState` inside `AgentConnectionsWindow`. The window registry stores `activeSection` in its default data (`features/window-panels/registry/windowRegistry.ts:642`) but nothing consumes it yet.

**API endpoints**
- None owned by this feature. Runtime tool access is resolved server-side from the agent definition (`POST /ai/agents/{id}` — see `features/agents/FEATURE.md`).

---

## Data model

**Database tables**
- None owned by this feature. No `agent_connection` / `agent_connections` table exists in the codebase. Tool and MCP configuration currently lives inside the agent definition itself (`agent_definition`, managed by `features/agents/redux/agent-definition/`) plus the MCP state in `features/agents/redux/mcp.slice.ts`.

**Key types** (`features/agent-connections/types.ts`)
- `AgentConnectionsSection` — `"overview" | "agents" | "skills" | "instructions" | "prompts" | "hooks" | "mcpServers" | "plugins"`
- `SidebarSection`, `OverviewCard` — sidebar + overview card shapes (label, icon, count, action)
- `SectionGroup<T>` — generic `{ key, label, items[] }` grouping used by Skills / Hooks / MCP sections
- `SkillEntry`, `AgentEntry`, `HookEntry`, `McpServerEntry` — list-row item shapes (id, name, description/filename, optional status)
- `McpServerStatus` — `"running" | "stopped" | "error"`

**Mock data source** (`features/agent-connections/data.ts`)
All sections read from hardcoded exports: `SKILL_GROUPS`, `HOOK_GROUPS`, `MCP_GROUPS`, `AGENT_ENTRIES`, `AGENT_FILE_PREVIEW`. These are placeholders; nothing is fetched.

---

## Key flows

### (a) Configuring tool access per agent
**Not implemented here.** Today, tool/model/MCP selection for an agent happens in `features/agents/` (the Builder) and is persisted as part of the agent definition. When a user opens the Connections window there is no `agentId` prop threaded through; the sections render global/mock lists, not per-agent configurations. Wiring this up requires:
1. A route (or prop) providing the active `agentId`.
2. Selectors against `agentDefinition` for the agent's currently attached skills / MCP servers / hooks.
3. Mutations through the existing agent-definition thunks (not new endpoints).

### (b) Managing API keys / external auth
**Not implemented here.** No credential storage, no key vault UI, no service calls. External tool authentication (OAuth, API keys) is the domain of `features/agents/services/mcp-oauth/` and belongs documented in `features/api-integrations/FEATURE.md`. If key management lands in this hub later, it must never surface secrets to the client — tokens are server-side only.

### (c) Runtime resolution at agent invocation
Agent invocations hit `POST /ai/agents/{id}` with the agent ID plus per-call inputs. The server resolves the full tool/MCP/skill list from the stored agent definition and assembles the execution context. **The client never sees the complete tool list directly**, and this UI does not change that — anything it eventually mutates must round-trip through the agent-definition writes on the server. See `features/agents/FEATURE.md` → "Two invocation payloads" for the Builder-vs-Runner split.

### (d) Current demo-only flow (what actually runs today)
1. Overlay controller opens `AgentConnectionsWindow`.
2. Local `useState<AgentConnectionsSection>` starts at `"overview"` (or `initialSection` prop).
3. Sidebar click → `setActiveSection(value)`.
4. `AgentConnectionsBody` switch renders the matching section.
5. Section filters its hardcoded group list by search string; selecting an agent shows `AGENT_FILE_PREVIEW` as a static numbered preview.
6. No mutations, no network calls, no persistence. Close the window — all local state gone.

---

## Invariants & gotchas

- **This is a shell, not a system of record.** Do not treat `data.ts` as a source of truth — any "real" Connections work must resolve through `features/agents/redux/agent-definition/` (tools/skills attached to the agent) and `features/agents/redux/mcp.slice.ts` (MCP server state).
- **Client never sees the full tool list.** The server owns tool resolution per agent invocation. If this hub grows editing capabilities, display must be selector-driven off the already-loaded agent definition, not a separate fetch that would leak the registry.
- **Connection auth stays server-side.** API keys, OAuth tokens, MCP server credentials are never rendered or round-tripped through client state. `features/agents/services/mcp-oauth/` owns the OAuth dance.
- **The stated route does not exist yet.** Docs and PRDs reference `/ai/agents/[id]/connections`; the code ships a floating window instead. Do not create the route without checking with the agent-system owners — it may be intentionally a window/overlay.
- **`count` values in `SIDEBAR_SECTIONS` are hardcoded** (Agents: 8, Skills: 25, Prompts: 1, Hooks: 5, MCP Servers: 8). Replace with selectors before shipping.
- **Prompts are dead.** The Prompts section is a placeholder row. The prompts system has been superseded by agents + shortcuts + agent-apps (see `features/agents/migration/`). A "Prompts" tab inside Connections is legacy surface by name; treat it as a slot to repurpose or remove.
- **No permission gating lives here.** Scope (admin/user/org) is expected to apply to most sections (shortcuts, hooks, instructions are multi-scope by project rule), but nothing enforces or filters by scope in this feature yet.

---

## Related features

- **Depends on (when wired up):** `features/agents/` (agent definition + MCP state + tool registry), `features/api-integrations/` (external tool + MCP catalog, auth storage — see its forthcoming `FEATURE.md`)
- **Depended on by:** `features/window-panels/` (registers the window + overlay), `components/overlays/OverlayController.tsx` (dynamic import + mount)
- **Cross-links:**
  - `features/agents/FEATURE.md` — umbrella for agent runtime, invocation, and tool resolution
  - `features/agents/agent-system-mental-model.md` — how tools participate in an agent turn
  - `features/agents/services/mcp.service.ts` — MCP wiring used at invocation time
  - `features/api-integrations/FEATURE.md` *(forthcoming)* — canonical doc for external integrations, MCP protocol details, and credential storage
  - `features/window-panels/registry/windowRegistry.ts` — registration of `agent-connections-window`

---

## Current work / migration state

Scaffolded UI only. Before adding real behavior:

1. Decide surface (floating window vs. dedicated route under `app/(a)/agents/[id]/...`). Coordinate with the agents migration plan at `features/agents/migration/MASTER-PLAN.md`.
2. Replace hardcoded `data.ts` with selectors off `agentDefinition` + `mcp` slices — no parallel local state (project rule: RTK only for new state).
3. Thread `agentId` through the window/route; all sections become per-agent views.
4. Defer credential / API-key UI to `features/api-integrations/` — do not implement auth storage here.

---

## Change log

- `2026-04-22` — claude: initial doc.

---

> **Keep-docs-live rule (CLAUDE.md):** after any substantive change to this feature — especially when mock data is replaced with real selectors, a real route is added, or this hub starts mutating agent definitions — update status, flows (a)/(b)/(c), and append to the Change log. Stale FEATURE.md cascades across parallel agents.
