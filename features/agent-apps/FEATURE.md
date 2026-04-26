# FEATURE.md — `agent-apps`

**Status:** `live (data-migration soak)` — backing DB table is `aga_apps` with 54 rows migrated from `prompt_apps`. Public dual-path resolver in `/p/[slug]` prefers agent path. Authenticated CRUD + admin UI live. Redux thunks still stubbed (admin/CRUD paths use the service layer; not blocking).
**Tier:** `1`
**Last updated:** `2026-04-25`

---

## Purpose

An **Agent App** is a custom UI for a specific workflow. Where a Shortcut *auto-fills* variables, an App *provides a different way to supply them* — often one that doesn't look like AI at all. No chat box. Sometimes no model output in chat form — the agent's result is rendered as an **artifact** directly into the UI.

Successor to the legacy `features/prompt-apps/` (still live, deprecated) and `features/applet/` (fully deprecated). Do not extend the legacy surfaces.

---

## Entry points

**Routes**
- `app/(authenticated)/applets/` — legacy runner surface
- `app/(authenticated)/apps/` — target surface for agent-apps (scaffolding)
- Migration phases: `features/agents/migration/phases/phase-08-agent-apps-public.md` (public URL variant), `phase-09-admin-agent-apps.md`, `phase-10-applets-capture.md`

**Feature code** (`features/agent-apps/`)
- `components/`, `sample-code/`, `services/`, `utils/`, `types.ts`, `index.ts`

**Redux** (canonical slice lives with agents)
- `features/agents/redux/agent-apps/` — slice, selectors, types, thunks (currently stubbed)

---

## Data model

Provisional type from `features/agents/redux/agent-apps/types.ts`:

```ts
interface AgentApp {
  id: string;
  label: string;
  description: string | null;
  iconName: string | null;
  origin: "template" | "ai_generated" | "custom";
  templateId: string | null;
  sourceCode: string | null;
  primaryAgentId: string | null;
  primaryAgentVersionId: string | null;
  useLatest: boolean;                     // pin-by-version default
  embeddedShortcutIds: string[];
  scopeMappings: Record<string, string> | null;
  isActive: boolean;
  isPublic: boolean;
  userId: string | null;
  organizationId: string | null;
  projectId: string | null;
  taskId: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Scope columns follow the same multi-scope model as `AgentShortcut` (see [`../scope-system/FEATURE.md`](../scope-system/FEATURE.md)).

---

## Three creation paths (the `origin` enum)

1. **`template`** — start from a library of standard scaffolds the user customizes. `templateId` references the source.
2. **`ai_generated`** — the in-app AI agent builds the App from a user description.
3. **`custom`** — engineer builds within the framework's structural rules. `sourceCode` holds the rendered component source (transformed via Babel → `new Function()` with allowlisted imports, same pattern as prompt-apps).

---

## Composition

- Apps can embed Shortcuts via `embeddedShortcutIds`.
- A Shortcut inside an App can invoke an agent from *another* App.
- This composition is where the model gets powerful. Example flow:
  - Flashcard Generator **App** renders flashcards as artifacts.
  - Inside that interface lives an "I'm Confused" **Shortcut** invoking the Tutor **agent**.
  - Also inside: a "Make Me a Quiz" **Shortcut** invoking the Quiz Maker **agent** — which renders the Quiz App (another Agent App).
  - Inside the Quiz App, missed questions can fire "Make Flashcards" → back to the Flashcard Generator agent.
  - Three agents, two apps, composed via shortcuts — user never types a prompt.

---

## Public agent-apps

Some Apps are public (`isPublic: true`). The public URL pattern mirrors today's `/p/[slug]` for prompt-apps; see `phase-08-agent-apps-public.md` for the new target. Public apps:
- Run without authentication
- Use ephemeral invocation (no DB persistence) — see [`AGENT_INVOCATION_LIFECYCLE`](../agents/docs/AGENT_INVOCATION_LIFECYCLE.md) ephemeral branch
- Have fingerprint + IP rate limiting (inherited pattern from prompt-apps)

---

## Key flows

### Flow 1 — Engineer creates a custom App

1. Open the App builder (admin or user surface).
2. Pick `origin: "custom"`. Provide `sourceCode`, `primaryAgentId` + pin a version.
3. Define `scopeMappings` (UI context → agent variables).
4. Embed Shortcuts by ID.
5. Save → row inserted.

### Flow 2 — User opens an Agent App

1. Route loads App row. `sourceCode` is Babel-transformed and mounted with scoped imports.
2. The App's UI renders; user interacts.
3. App dispatches invocations (directly or through embedded Shortcuts) → `launchConversation` → stream back → artifacts render inline.

### Flow 3 — Public App request

1. Public URL → server fetches App row (public SELECT via RLS).
2. Client mounts with `origin.isEphemeral: true`.
3. First turn → `POST /ai/agents/{id}` with `store: false`.
4. Subsequent turns → `POST /ai/chat` with full history.

---

## Invariants & gotchas

- **Pin-by-version default.** Apps embed specific `primaryAgentVersionId`. `useLatest: true` is rare and risky — same contract as Shortcuts.
- **Redux canonical location is under `features/agents/redux/agent-apps/`.** Do not create a parallel slice.
- **`sourceCode` executes in a sandbox.** Import allowlisting, variable validation — mirror the prompt-apps security model.
- **Apps do not have a chat window by default.** Rendering agent output via artifacts is the norm; the model produces structured output, the UI renders it as real components, user actions feed back into the next turn.
- **Composition is the design intent.** Apps embed Shortcuts; Shortcuts can point at agents from other Apps. Do not design against composition.
- **Legacy context:** `features/prompt-apps/` and `features/applet/` are predecessors. Do not extend them. See `features/agents/migration/INVENTORY.md` for the legacy ↔ agent map.

---

## Related features

- **Depends on:** `features/agents/`, `features/agent-shortcuts/`, `features/artifacts/` (rendering), `features/agent-context/` (variable/scope resolution)
- **Depended on by:** Public URL consumers, admin/user/org app libraries
- **Cross-links:** `features/agents/docs/AGENT_INVOCATION_LIFECYCLE.md` (ephemeral branch), `features/agents/agent-system-mental-model.md` §6, `features/tool-call-visualization/FEATURE.md`

---

## Current work / migration state

Thunks stub and throw. Backing DB table not yet created. UI rendering path in build. Track progress in:
- `features/agents/migration/phases/phase-08-agent-apps-public.md`
- `features/agents/migration/phases/phase-09-admin-agent-apps.md`
- `features/agents/migration/phases/phase-10-applets-capture.md`

---

## Change log

- `2026-04-25` — `AgentAppPublicRenderer` now delegates execution to `dispatch(launchAgentExecution({ agentId, displayMode: "direct", variables, userInput, ... }))` — the same orchestrator thunk used by `useShortcutTrigger`, `useAgentLauncher`, the `/chat` route, and the AI code editor. Streaming state, request lifecycle, conversation creation, URL routing (`/ai/agents/{id}` ↔ `/ai/conversations/{id}`), `is_new` / `is_version` flags, auth-header injection (Bearer JWT for authed, fingerprint for guests), and server-picker resolution all live inside the launcher — the renderer just subscribes by `requestId` via `selectAccumulatedText` and `selectRequest`. The two-phase rewrite that came before this entry (calling Python directly with hand-rolled body shapes) is gone — that was still reinventing the wheel. `displayMode: "direct"` keeps the user's TSX (Babel sandbox) as the UI surface; the launcher does not open any overlay. Added `"agent-app"` to the `SourceFeature` union for telemetry. Bespoke `/api/public/agent-apps/[slug]/execute` route remains marked DEPRECATED — no longer reachable from any client code path.
- `2026-04-25` — `get_aga_public_data` RPC extended to return `agent_id`, `agent_version_id`, `use_latest`. The Phase-8 "agent_id off the wire" rule was a self-imposed constraint not used elsewhere in the system (shortcuts always exposed `agx_shortcut.agent_id` to the client). Matching the shortcut model unlocks the standard launcher path. `PublicAgentApp` updated to keep those fields.
- `2026-04-25` — Migrated 54 of 61 `prompt_apps` rows into `aga_apps` via `migrations/migrate_prompt_apps_to_aga_apps.sql`. IDs preserved (`agent_id := prompt_id` — verified 100% match against `agx_agent`). All migrated rows force `use_latest=true` because legacy `prompt_version_id`s are orphaned in `agx_version`. `status='published'` rows flipped to `is_public=true` so the dual-path resolver in `/p/[slug]` can serve them publicly. 7 apps with variable-name mismatches (`metro_name → region_name`, `state → state_name`, orphan `presentation_style`) skipped pending manual fix; they remain on the legacy prompt-app path. `success_rate` normalized from mixed 0..100 / 0..1 to 0..1 fraction. Aggregate counters carried over; raw `prompt_app_executions` not migrated.
- `2026-04-25` — Renamed 18 runtime references of `"agent_apps"` to `"aga_apps"` across `app/(public)/p/[slug]/page.tsx`, `app/api/agent-apps/**`, `app/api/public/agent-apps/[slug]/execute/route.ts`, `lib/services/agent-apps-admin-service.ts`. The deployed table has always been `aga_apps`; sibling tables (`aga_executions`, `aga_errors`, `aga_rate_limits`, `aga_categories`, `aga_versions`) were already correctly referenced. The main-table mismatch had gone unnoticed only because no rows had ever flowed through these code paths until this migration.
- `2026-04-25` — Admin route imports: `AgentAppsGrid`, editor shell components, and `AgentApp` type now use direct paths (`components/layouts/…`, `components/…`, `types`) instead of `@/features/agent-apps` barrel.
- `2026-04-22` — claude: initial FEATURE.md extracted from `agent-system-mental-model.md` §6.
- `2026-04-22` — claude: `POST /api/agent-apps` now accepts `scope: "global"` for admins, writing rows with all scope columns null via `createAdminClient()`. New admin UI lives at `administration/system-agents/apps/` (list + `apps/new/` form). This is distinct from `administration/agent-apps/` (moderation of user-published apps). `fetchAgentAppsAdmin` gained a `scope: "global" | "user"` filter.

---

> **Keep-docs-live:** when `AgentApp` type stabilizes, update the type block here. When the DB table ships, update the Data model. When the public URL pattern lands, update Key flows.
