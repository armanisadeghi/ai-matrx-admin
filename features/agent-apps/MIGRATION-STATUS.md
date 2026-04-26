# Agent Apps — Migration Status & Completion Plan

**Status (2026-04-25):** mid-migration. Public runtime is live and uses the
canonical agent-execution path. 54 of 61 production rows migrated. User-
facing CRUD UIs and the AI-assisted creation flow are still missing.
This document is the single source of truth for what is done and what is
left to do before the legacy `prompt_apps` surface can be deleted.

> **Read order if you're picking this up cold:**
>
> 1. This file (top to bottom).
> 2. [features/agent-apps/FEATURE.md](FEATURE.md) — feature mental model + change log.
> 3. [features/agents/migration/MASTER-PLAN.md](../agents/migration/MASTER-PLAN.md) — the umbrella prompts→agents plan; agent-apps is one slice of that.
> 4. [features/agents/migration/INVENTORY.md](../agents/migration/INVENTORY.md) — full legacy-surface inventory.

---

## 1. Done

### 1.1 Database

| Table / RPC | Status |
|---|---|
| `aga_apps` | ✅ Live. 54 rows migrated from `prompt_apps`. |
| `aga_executions` | ✅ Live. Used by current public runtime. |
| `aga_errors` | ✅ Live. Insert trigger maps stream errors. |
| `aga_rate_limits` | ✅ Live. BEFORE-INSERT trigger `enforce_aga_rate_limit` rejects with `check_violation` → mapped to HTTP 429 by callers. |
| `aga_versions` | ✅ Live. Snapshot triggers wired. |
| `aga_categories` | ✅ Live. 10 seeded. |
| `get_aga_public_data(p_slug, p_app_id)` | ✅ Live. Returns public-safe subset **including `agent_id`, `agent_version_id`, `use_latest`** — required so the renderer can launch via the standard agent path. |

### 1.2 Data migration

One-time SQL: [migrations/migrate_prompt_apps_to_aga_apps.sql](../../migrations/migrate_prompt_apps_to_aga_apps.sql).

- 54/61 rows migrated. ID preserved (`agent_id := prompt_id` — verified 100% match against `agx_agent`).
- Skipped 7 apps with renamed-variable mismatches (their `variable_schema[].name` references the old prompt variable names; the agent now expects different names). Skipped slugs:
  - `balanced-news-analysis` (orphan `presentation_style`)
  - `enterprise-regional-itad-page-intro` (`metro_name`/`state` → `region_name`/`state_name`)
  - `regional-challenge-solution-writer` (`metro_name`)
  - `regional-itad-challenge-generator-app` (`metro_area_name`)
  - `regional-itad-page-generator` (`metro_name`/`state`)
  - `regional-service-coverage-section` (`metro_area_name`)
  - `regulatory-section-generator` (`metro_name`)
- All migrated rows force `use_latest=true`, `agent_version_id=NULL` (the legacy `prompt_version_id`s are orphaned in `agx_version`).
- `status='published'` rows flipped to `is_public=true` so the dual-path `/p/[slug]` resolver can serve them.
- `success_rate` normalized from mixed 0..100 / 0..1 to 0..1 fraction (`numeric(5,4)` constraint).
- Aggregate counters carried over (`total_executions`, `total_tokens_used`, `total_cost`, `unique_users_count`, `success_rate`, `avg_execution_time_ms`, `last_execution_at`).
- Raw `prompt_app_executions` and `prompt_app_errors` rows NOT migrated — they stay in legacy tables until Phase 19 drop.
- Lineage stamp: every migrated row has `metadata.migrated_from_prompt_app = { prompt_id, prompt_version_id, migrated_at }`.
- Scoped rollback: `DELETE FROM aga_apps WHERE metadata ? 'migrated_from_prompt_app'`.

### 1.3 Public runtime

| Surface | Status | File |
|---|---|---|
| `/p/[slug]` dual-path resolver (agent first, prompt fallback) | ✅ | [app/(public)/p/[slug]/page.tsx](../../app/(public)/p/[slug]/page.tsx) |
| `AgentAppPublicRenderer` — calls `dispatch(launchAgentExecution(...))` with `displayMode: "direct"` and `autoRun: true`. Streams via Redux selectors (`selectPrimaryRequest` keyed on `conversationId` from the synchronous `onConversationCreated` callback, then `selectAccumulatedText`). | ✅ | [features/agent-apps/components/AgentAppPublicRenderer.tsx](components/AgentAppPublicRenderer.tsx) |
| Pre-warm POST `/ai/agents/{id}/warm` on idle (post-mount) | ✅ | [features/agents/hooks/useWarmAgent.ts](../agents/hooks/useWarmAgent.ts) + [lib/api/warm-helpers.ts](../../lib/api/warm-helpers.ts) |
| Babel sandbox + import allowlist (security-critical) | ✅ | [features/agent-apps/utils/allowed-imports.ts](utils/allowed-imports.ts) — verbatim port from prompt-apps. **Do not widen.** |
| Display templates (form, chat, form-to-chat, centered-input, chat-with-history) | ✅ | [features/agent-apps/sample-code/templates/](sample-code/templates/) |
| Stable streaming subscription (uses `onConversationCreated` synchronous callback so selectors subscribe DURING the stream, not after) | ✅ | See `handleExecute` in `AgentAppPublicRenderer.tsx` |
| In-header server-picker honored (reads `selectResolvedBaseUrl`) | ✅ | via the launcher; renderer no longer hardcodes a URL |

### 1.4 APIs

| Endpoint | Status | File |
|---|---|---|
| `GET / PATCH / DELETE /api/agent-apps/[id]` | 🟡 LIVE but missing `user_id` ownership check on DELETE | [app/api/agent-apps/[id]/route.ts](../../app/api/agent-apps/[id]/route.ts) |
| `POST /api/agent-apps/[id]/duplicate` | ✅ | [app/api/agent-apps/[id]/duplicate/route.ts](../../app/api/agent-apps/[id]/duplicate/route.ts) |
| `POST /api/agent-apps/generate-favicon` | ✅ | [app/api/agent-apps/generate-favicon/route.ts](../../app/api/agent-apps/generate-favicon/route.ts) |
| `POST /api/agent-apps` (create — supports `scope: "global"` for admins) | ✅ | [app/api/agent-apps/route.ts](../../app/api/agent-apps/route.ts) |
| `POST /api/public/agent-apps/[slug]/execute` | ⚠️ DEPRECATED — kept as legacy fallback only; nothing in the client calls it. The renderer hits Python directly via the launcher. | [app/api/public/agent-apps/[slug]/execute/route.ts](../../app/api/public/agent-apps/[slug]/execute/route.ts) |
| `GET /api/public/agent-apps/response/[taskId]` | ⚠️ DEPRECATED (same reason). |
| Table-name rename: 18 `.from("agent_apps")` → `.from("aga_apps")` | ✅ | swept across `app/`, `features/`, `lib/` |

### 1.5 Admin UI (`/administration/agent-apps/`)

| Surface | Status | File |
|---|---|---|
| Tabbed layout (Dashboard / Apps / Categories / Executions) | ✅ | [app/(authenticated)/(admin-auth)/administration/agent-apps/layout.tsx](../../app/(authenticated)/(admin-auth)/administration/agent-apps/layout.tsx) |
| Dashboard with stats + featured grid + recently-updated grid | ✅ | `page.tsx` |
| Apps table with filters (name/slug/status/category/featured/verified/creator) + 8-column sort + row-level toggles | ✅ | `apps/page.tsx` |
| Categories CRUD (sidebar + detail, sort reorder, AlertDialog delete) | ✅ | `categories/page.tsx` |
| Executions + Errors tabbed view with resolve/unresolve + detail dialog | ✅ | `executions/page.tsx` |
| Edit page (Admin tab + Code tab — `AgentAppAdminActions`, `UpdateAgentAppModal`, `AgentAppEditor`) | ✅ | `edit/[id]/page.tsx` |
| Service layer (categories, apps, executions, errors, rate-limits CRUD) | ✅ | [lib/services/agent-apps-admin-service.ts](../../lib/services/agent-apps-admin-service.ts) |

### 1.6 Components

| Component | Status |
|---|---|
| `AgentAppRenderer` (auth) | ✅ |
| `AgentAppPublicRenderer` | ✅ (rewritten to use the launcher) |
| `AgentAppEditor` (Babel JSX/TSX editor) | ✅ |
| `AgentAppPreview` | ✅ |
| `AgentAppErrorBoundary` | ✅ |
| `AgentAppHeaderCompact` | ✅ |
| `CreateAgentAppForm` | ✅ |
| `CreateAgentAppModal` | ✅ |
| `UpdateAgentAppModal` | ✅ |
| `AgentAppAdminActions` | ✅ |
| `SearchableAgentSelect` | ✅ |
| `AgentAppsGrid` | ✅ |
| `AgentAppCard` | ✅ |
| `AgentAppListItem` | ✅ |
| `AgentAppActionModal` | ✅ |

### 1.7 Hydration mismatch fix

[components/matrx/PublicHeaderAuth.tsx](../../components/matrx/PublicHeaderAuth.tsx) now mount-gates the auth check with a `useEffect` `setMounted(true)` so the very first client render matches the SSR output (always unauthenticated → Sign In `<Button>`). Fixes the hydration error that was tearing down the entire public-route subtree on `/p/[slug]` and other public pages.

---

## 2. NOT done (gaps that still block deletion of `prompt_apps`)

> **Source of truth for these gaps:** the parity audit summarized below. The
> #1 directive from the user: **duplicate** the prompt-apps editing UI rather
> than rewrite from scratch. The editor + auto-create flow is too much work
> to redo. Copy, change the data source to `aga_apps`, clean up. That's it.

### 2.1 🔴 BLOCKERS — must ship before retiring prompt-apps

#### B1. User-facing `/agent-apps/` route family — MISSING

| Page (prompt-apps, the duplication target) | New path |
|---|---|
| [app/(authenticated)/prompt-apps/page.tsx](../../app/(authenticated)/prompt-apps/page.tsx) (server entry) | `app/(authenticated)/agent-apps/page.tsx` |
| [PromptAppsListClient.tsx](../../app/(authenticated)/prompt-apps/PromptAppsListClient.tsx) (the actual list UI) | `app/(authenticated)/agent-apps/AgentAppsListClient.tsx` |
| [layout.tsx](../../app/(authenticated)/prompt-apps/layout.tsx) | `app/(authenticated)/agent-apps/layout.tsx` |
| [loading.tsx](../../app/(authenticated)/prompt-apps/loading.tsx) | `app/(authenticated)/agent-apps/loading.tsx` |
| [new/page.tsx](../../app/(authenticated)/prompt-apps/new/page.tsx) + [new/layout.tsx](../../app/(authenticated)/prompt-apps/new/layout.tsx) | `app/(authenticated)/agent-apps/new/{page,layout}.tsx` |
| [[id]/page.tsx](../../app/(authenticated)/prompt-apps/[id]/page.tsx) + [[id]/layout.tsx](../../app/(authenticated)/prompt-apps/[id]/layout.tsx) + [[id]/not-found.tsx](../../app/(authenticated)/prompt-apps/[id]/not-found.tsx) | `app/(authenticated)/agent-apps/[id]/{page,layout,not-found}.tsx` |
| [templates/page.tsx](../../app/(authenticated)/prompt-apps/templates/page.tsx) | `app/(authenticated)/agent-apps/templates/page.tsx` |
| [templates/[mode]/page.tsx](../../app/(authenticated)/prompt-apps/templates/[mode]/page.tsx) | `app/(authenticated)/agent-apps/templates/[mode]/page.tsx` |

**Duplication directive:** copy each file 1:1, then:

1. Rename component imports `Prompt` → `Agent`.
2. Replace data calls: `from("prompt_apps")` → `from("aga_apps")`. Replace
   any `prompt_id`/`prompt_version_id` references with
   `agent_id`/`agent_version_id`/`use_latest`.
3. Drop `is_verified` references (we kept the column but it's unused;
   audit-only).
4. Replace `<PromptAppRenderer>` / `<UpdatePromptAppModal>` /
   `<CreatePromptAppForm>` with their `Agent*` siblings (already exist).
5. Remove dead branches: anywhere the legacy code referenced
   `prompt_source_type === "builtin"` is dead — drop it. Agents have a
   single source.
6. Routing — replace `/prompt-apps/...` link strings with `/agent-apps/...`.
7. Imports — drop barrels (`@/features/agent-apps`); use direct paths per CLAUDE.md.

#### B2. AI-assisted "create app from prompt" flow — MISSING

| Source (prompt-apps) | LOC | Target |
|---|---|---|
| [features/prompt-apps/components/AutoCreatePromptAppForm.tsx](../prompt-apps/components/AutoCreatePromptAppForm.tsx) | 1490 | `features/agent-apps/components/AutoCreateAgentAppForm.tsx` |
| [features/prompt-apps/components/AutoCreateDebugView.tsx](../prompt-apps/components/AutoCreateDebugView.tsx) | 77 | `features/agent-apps/components/AutoCreateDebugView.tsx` |
| [features/prompt-apps/hooks/useAutoCreateApp.ts](../prompt-apps/hooks/useAutoCreateApp.ts) | ~600 | `features/agent-apps/hooks/useAutoCreateApp.ts` |
| [features/prompt-apps/config-instructions.ts](../prompt-apps/config-instructions.ts) | ~? | `features/agent-apps/config-instructions.ts` |

This is the largest single piece of work. Strategy:

- **Copy verbatim**, then swap the streaming source.
- Today the flow runs against `prompt_builtins` via `usePromptRunner` /
  socket.io to generate metadata + component code. The replacement runs
  against an **agent** via the standard `launchAgentExecution` path
  (same one the public renderer uses). The agent ID for the AI-app-builder
  is a config value — see `features/agents/migration/phases/phase-06-code-editor-quick-wrapper.md`
  for the analogous code-editor decision.
- The Web Locks API tab-safety, error recovery, and Babel transpilation
  logic is portable as-is. Keep it.
- Variable schema generation: today the auto-create form derives
  `variable_schema` from the prompt's template variables. The agent
  equivalent is `agx_agent.variable_definitions`. Wire the form to read
  from there.

#### B3. Wire the Redux thunks (replace stub-throws)

[features/agents/redux/agent-apps/thunks.ts](../agents/redux/agent-apps/thunks.ts) — every thunk currently throws `NOT_IMPLEMENTED`:

- `fetchAppsInitial`
- `fetchAppById`
- `saveApp`
- `saveAppField`
- `createApp`
- `deleteApp`
- `addEmbeddedShortcut`
- `removeEmbeddedShortcut`

The user-facing list/edit pages will need at least `fetchAppsInitial`,
`fetchAppById`, `saveApp`, `saveAppField`, `createApp`, `deleteApp`. Wire
these to the existing service layer
([lib/services/agent-apps-admin-service.ts](../../lib/services/agent-apps-admin-service.ts))
or to direct Supabase queries. `embeddedShortcutIds` is Phase 10 (applets);
those two thunks can stay stubbed until then.

### 2.2 🟡 IMPORTANT — admins lose tooling without these

| # | Gap | Source to copy | Target |
|---|---|---|---|
| I1 | Admin **rate-limits override** UI — DB columns exist, no UI to set per-app limits or temporary blocks. | [.../administration/prompt-apps/components/RateLimitsAdmin.tsx](../../app/(authenticated)/(admin-auth)/administration/prompt-apps/components/RateLimitsAdmin.tsx) | `.../administration/agent-apps/rate-limits/page.tsx` |
| I2 | Admin **analytics dashboard** — current admin shows summary tiles only; prompt-apps has a full insights tab. | [AnalyticsAdmin.tsx](../../app/(authenticated)/(admin-auth)/administration/prompt-apps/components/AnalyticsAdmin.tsx) | `.../administration/agent-apps/analytics/page.tsx` |
| I3 | Admin **errors-tab parity** — confirm `aga_errors` rows surface in the existing executions tab; if not, port [ErrorsAdmin.tsx](../../app/(authenticated)/(admin-auth)/administration/prompt-apps/components/ErrorsAdmin.tsx). | as needed | as needed |
| I4 | `/agents/[id]/apps` agent-context view — currently a placeholder linking to legacy App Builder. Now trivially wireable: query `aga_apps WHERE agent_id = :id` and render via `AgentAppsGrid`. | [app/(a)/agents/[id]/apps/page.tsx](../../app/(a)/agents/[id]/apps/page.tsx) (placeholder) + [features/agents/components/apps/AgentAppsPanel.tsx](../agents/components/apps/AgentAppsPanel.tsx) (placeholder) | rewrite both to query `aga_apps` directly |
| I5 | DELETE `/api/agent-apps/[id]` ownership check — currently relies on RLS only; prompt-apps version uses `.eq("user_id", user.id)` as belt-and-suspenders. | [app/api/prompt-apps/[id]/route.ts](../../app/api/prompt-apps/[id]/route.ts) | one-line addition to existing route |
| I6 | `/org/[slug]/agent-apps/` placeholder — prompt-apps version is "Coming Soon"; keep that pattern so URL space matches before deletion. | [app/(authenticated)/org/[slug]/prompt-apps/page.tsx](../../app/(authenticated)/org/%5Bslug%5D/prompt-apps/page.tsx) | mirror as `agent-apps` placeholder |

### 2.3 🟢 NICE-TO-HAVE / convenience

| # | Gap | Source | Target |
|---|---|---|---|
| N1 | HTML embed export modal — generates standalone HTML for sharing app responses on external sites. | [QuickHtmlShareModal.tsx](../prompt-apps/components/QuickHtmlShareModal.tsx) | `features/agent-apps/components/QuickHtmlShareModal.tsx` |
| N2 | Migrate the 5 remaining hand-rolled warm-fetch callsites to use [lib/api/warm-helpers.ts](../../lib/api/warm-helpers.ts) so the in-header server picker is honored everywhere. | `app/(public)/p/chat/{a,c}/[id]/page.tsx`, `app/(ssr)/ssr/chat/**/page.tsx` | replace with `warmAgent` / `warmConversation` |
| N3 | Patch the 7 skipped apps' `variable_schema` field names so they match the agent's `variable_definitions`, then re-run the migration script (idempotent). | per audit table above | manual SQL or admin UI |
| N4 | Tag management UI in the admin apps list. | (no prompt-apps equivalent; small future polish) | — |

### 2.4 🗑️ Drop — DO NOT port

| What | Why |
|---|---|
| `PromptAppPublicRendererFastAPI.tsx` (740 LOC) | Superseded by `launchAgentExecution`; the launcher abstracts the transport. |
| `PromptAppPublicRendererDirect.tsx` (544 LOC) | Same — direct streaming without the launcher is no longer the pattern. |
| `PromptAppsDesktopSearchBar.tsx` | Replace with the global search shell. |
| `AutoCreateDebugView` (port is optional) | Debug-only; ship the flow without it. |
| `prompt_id` / `prompt_version_id` / `prompt_source_type` references | These columns don't exist on `aga_apps`. Strip cleanly. |
| `is_verified` UI | Column kept for data preservation; not exposed to users. |

---

## 3. Execution plan — work order to clear the runway

This is the order to execute. After each block lands, smoke-test before
moving on. Goal: **end of plan = green light to delete `prompt_apps`**.

### Block 1 — Easy wins (warm-up, ~1 hour total)

- [ ] **`/agents/[id]/apps`** — rewrite the placeholder to query `aga_apps WHERE agent_id = :id` and render via `AgentAppsGrid`. The schema is now direct (`aga_apps.agent_id` is a real FK), so the open questions in `NOTES.md` are obsolete — delete that file. `(2 files)`
- [ ] **DELETE ownership check** — add `.eq("user_id", user.id)` to the DELETE branch in [app/api/agent-apps/[id]/route.ts](../../app/api/agent-apps/[id]/route.ts). `(1 line)`
- [ ] **`/org/[slug]/agent-apps/` placeholder** — duplicate the prompt-apps "Coming Soon" page. `(1 file)`

### Block 2 — Wire the Redux layer (~half day)

- [ ] **Replace stub-throws in [features/agents/redux/agent-apps/thunks.ts](../agents/redux/agent-apps/thunks.ts)** with real implementations backed by Supabase / the admin service. Six thunks need bodies; two (`addEmbeddedShortcut` / `removeEmbeddedShortcut`) can stay stubbed until Phase 10.
- [ ] Verify `slice.ts` and `selectors.ts` cover what the user routes need (read-many, read-one, dirty-field tracking, save).

### Block 3 — Duplicate the user-facing CRUD surface (~half-to-full day)

> The directive: COPY the prompt-apps surface, retarget the data layer, clean
> up. Do not rebuild from scratch.

For each file in the table under §2.1 B1 (the duplication target), in this
order:

1. [ ] `app/(authenticated)/agent-apps/layout.tsx` + `loading.tsx`
2. [ ] `app/(authenticated)/agent-apps/page.tsx` + `AgentAppsListClient.tsx`
3. [ ] `app/(authenticated)/agent-apps/new/{layout,page}.tsx`
4. [ ] `app/(authenticated)/agent-apps/[id]/{layout,page,not-found}.tsx`
5. [ ] `app/(authenticated)/agent-apps/templates/page.tsx`
6. [ ] `app/(authenticated)/agent-apps/templates/[mode]/page.tsx`

Apply the rewrite recipe from §2.1 B1 to each file. After each step, smoke
the affected URL (list → click row → edit → save round-trips).

### Block 4 — Port AutoCreate (~1–2 days)

- [ ] **Copy** [features/prompt-apps/components/AutoCreatePromptAppForm.tsx](../prompt-apps/components/AutoCreatePromptAppForm.tsx) and [hooks/useAutoCreateApp.ts](../prompt-apps/hooks/useAutoCreateApp.ts) verbatim into `features/agent-apps/`.
- [ ] **Swap the streaming source.** Replace `usePromptRunner` / direct prompt-builtin invocations with `dispatch(launchAgentExecution({ agentId: <ai-builder-agent>, ... }))`. The streaming-state subscription pattern is the same as `AgentAppPublicRenderer.handleExecute`.
- [ ] **Variable-schema source.** Replace prompt-template-variable extraction with `agx_agent.variable_definitions` lookup.
- [ ] **Choose the AI-builder agent ID.** Surface as a config / env constant. (This decision parallels the Phase-6 code-editor agent-id choice — capture it in `features/agents/migration/phases/`.)
- [ ] **Mount under the new route** — `/agent-apps/new/ai/page.tsx` or similar.
- [ ] Smoke: end-to-end "describe an app → see it generated → save it → run it from `/p/<slug>`."

### Block 5 — Admin tools parity (~half day)

- [ ] **Rate-limits override page** — duplicate `RateLimitsAdmin.tsx`, retarget to `aga_apps` + `aga_rate_limits`. Mount at `.../administration/agent-apps/rate-limits/page.tsx`.
- [ ] **Analytics dashboard** — duplicate `AnalyticsAdmin.tsx`, retarget queries. Mount at `.../administration/agent-apps/analytics/page.tsx`.
- [ ] **Errors-tab confirmation** — load `/administration/agent-apps/executions` against a row known to have errors and confirm they render. Port `ErrorsAdmin.tsx` only if the existing tab is insufficient.

### Block 6 — Convenience polish (~2 hours)

- [ ] **Port [QuickHtmlShareModal.tsx](../prompt-apps/components/QuickHtmlShareModal.tsx)** to `features/agent-apps/components/`. Update the embed-code template to point at `/p/<slug>` (no change needed — the slug is the same).
- [ ] **Migrate the 5 hand-rolled warm-fetch callsites** to `warmAgent`/`warmConversation`. Server-side callers pass `BACKEND_URLS.production`; client-side callers should switch to `useWarmAgent`/`useWarmConversation` (add the conversation hook if not present).

### Block 7 — Patch the 7 skipped apps and re-migrate (~1 hour)

- [ ] For each of the 7 skipped slugs in §1.2, decide: (a) update the app's `variable_schema[].name` to the new agent variable name (e.g. `metro_name` → `region_name`), or (b) update the agent's `variable_definitions` to add aliases. Recommendation: (a) — patches are scoped to one app at a time.
- [ ] Re-run [migrations/migrate_prompt_apps_to_aga_apps.sql](../../migrations/migrate_prompt_apps_to_aga_apps.sql). It's idempotent; only the now-fixable rows will land.
- [ ] Verify `SELECT count(*) FROM aga_apps WHERE metadata ? 'migrated_from_prompt_app'` returns 61.

### Block 8 — Final smoke + green light (~1 hour)

- [ ] **End-to-end smoke** of 5 representative apps as guest: form display, chat display, rate-limit hit, very long stream, app with category filter.
- [ ] **End-to-end smoke** of authenticated CRUD: create new app from scratch, AI-create from agent, edit code, edit metadata, duplicate, delete.
- [ ] **Admin smoke**: feature/verify/suspend/rate-limit-override/categories CRUD/analytics view.
- [ ] **Update [features/agents/migration/MASTER-PLAN.md](../agents/migration/MASTER-PLAN.md)** to reflect agent-apps `live` status across the board.
- [ ] **Update [features/agents/migration/INVENTORY.md](../agents/migration/INVENTORY.md)** with this completion entry.
- [ ] **Update [FEATURE.md](FEATURE.md) Change Log** with the final state.
- [ ] **Green light:** prompt_apps can now be deleted. The deletion itself follows Phases 16/17/18/19 of the master plan — routes, APIs, code, then DB tables — with a soak window in between (Phase 14).

---

## 4. What is OUT of scope for this work

These are real work items but live elsewhere and should not delay the
agent-apps green light:

- **Phase 10 — Applets** (composite apps that embed multiple shortcuts).
  The `app_kind` and `shared_context_slots` columns on `aga_apps` exist for
  this; the UI is a separate effort. All migrated rows are `app_kind: 'single'`.
- **Phase 14 — Dual-run soak**. The agent-apps surface lives alongside
  prompt-apps for 2–4 weeks of production traffic. This plan ends at "ready
  for soak"; the soak itself is its own phase.
- **Phases 16–19 — Deprecation cascade** (route removal → API removal →
  feature-code removal → DB drop). Defined in the master plan; runs after
  Phase 14 closes cleanly.

---

## 5. References

- [features/agent-apps/FEATURE.md](FEATURE.md) — feature mental model, change log
- [features/agents/migration/MASTER-PLAN.md](../agents/migration/MASTER-PLAN.md) — umbrella prompts→agents plan
- [features/agents/migration/INVENTORY.md](../agents/migration/INVENTORY.md) — full legacy-surface inventory
- [features/agents/migration/phases/phase-08-agent-apps-public.md](../agents/migration/phases/phase-08-agent-apps-public.md) — original Phase 8 ship doc
- [features/agents/migration/phases/phase-09-admin-agent-apps.md](../agents/migration/phases/phase-09-admin-agent-apps.md) — admin UI ship doc
- [migrations/migrate_prompt_apps_to_aga_apps.sql](../../migrations/migrate_prompt_apps_to_aga_apps.sql) — the data migration

---

## 6. Change log for this document

- `2026-04-25` — initial draft. Captures parity audit, lists blockers/important/nice-to-have, defines duplication directive, sets execution order through to green-light.
