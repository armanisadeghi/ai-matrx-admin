# Decisions Log — Prompts → Agents Migration

Append one entry per decision. Never edit past entries; supersede with a new entry that links to the old one.

## Format

```
### YYYY-MM-DD — <short title>
**Phase:** N | all
**Decision:** <one sentence>
**Rationale:** <why>
**Consequences:** <what breaks if we reverse this, what is now true>
```

---

### 2026-04-20 — Dead concepts excluded from migration scope
**Phase:** all
**Decision:** No recipe→anything converter will be built. No prompt→agent converter will be built.
**Rationale:** All active recipes were long since converted to prompts, and all active user/system prompts have already been converted to agents. Users have no remaining source material to convert.
**Consequences:** `api/recipes/[id]/convert-to-prompt` is dead code (removed in Phase 17). No data-migration phase exists in this plan.

### 2026-04-20 — Shortcuts are multi-scope from day one
**Phase:** 1–13
**Decision:** Shortcuts, categories, and content blocks are CRUDable at admin (global), user (personal), and organization scopes from the first migration commit.
**Rationale:** The old system was admin-only and the UnifiedContextMenu already contained unused placeholders for user/org scopes. Building multi-scope as a retrofit would mean touching every shortcut file twice.
**Consequences:** `shortcut_categories` needs scope columns (Phase 1 DB migration). CRUD UI components must be scope-agnostic and mounted three times (admin/user/org routes). RLS must enforce scope boundaries.

### 2026-04-20 — Code editor: two-step replacement
**Phase:** 6 & 15
**Decision:** Phase 6 is a quick `usePromptRunner → useAgentLauncher` wrapper just to keep the one live coding feature (prompt_app component editing) working. Phase 15 is a full rebuild on agent tools with VSCode-style context slots.
**Rationale:** The new agent tool system is rich enough to eventually power a VSCode extension. Doing the big rebuild now would block too many downstream phases; doing only a wrapper permanently would lock in the weakest design.
**Consequences:** Phase 6 code will be deleted in Phase 15. Anything built in Phase 6 should be thin.

### 2026-04-20 — `(a)/chat` is an agent-runner shell
**Phase:** 7
**Decision:** The chat route lives under `(a)/chat` and is implemented as a thin shell over the existing agent runner. Agent selection spans own / system / community agents.
**Rationale:** If the execution-system is correct, chat is ~95% automatic. Resisting the temptation to build chat-specific state keeps the RTK surface clean.
**Consequences:** Chat does not get its own slices. `lib/ai/aiChatSlice` is deprecated in Phase 20.

### 2026-04-20 — Applets vision captured, not ported verbatim
**Phase:** 10
**Decision:** The `features/applet/` parent-app-with-children pattern (and its shared-context concept) is captured as an **agent-native pattern** built on `context-slots-management` — not by moving applet code over.
**Rationale:** The applets system predates real cross-app context sharing; now that context slots exist, the clean expression of that vision is an agent pattern, not a carried-over feature.
**Consequences:** `features/applet/` eventually deprecates (after Phase 10). `app/(authenticated)/apps/custom/*` routes redirect or sunset.

### 2026-04-20 — Content blocks: extend existing table, do not create `agent_content_blocks`
**Phase:** 1 (task 1.2)
**Decision:** The `public.content_blocks` table already exists and is referenced by `context_menu_unified_view`. Instead of creating a parallel `agent_content_blocks` table, extend the existing table with scope columns (`user_id`, `organization_id`, `project_id`, `task_id`) and widen its RLS.
**Rationale:** Content blocks are insertable text templates — inherently neither "prompt" nor "agent". Duplicating the table would fork data and force a later merge. The existing name is system-neutral.
**Consequences:** Phase 1 task 1.2 is a column addition + RLS expansion, not a new-table migration. Phase 19 does not drop `content_blocks`. Phase 2 simplifies — no table creation, just UI + RTK work.

### 2026-04-20 — Separate RTK slice dirs per resource (shortcuts / categories / content blocks)
**Phase:** 1 (task 1.5)
**Decision:** Categories and content blocks each get their own sibling slice directory under `features/agents/redux/` (`agent-shortcut-categories/`, `agent-content-blocks/`) with the full `types.ts` / `converters.ts` / `slice.ts` / `selectors.ts` / `thunks.ts` / `index.ts` file set, matching the existing `agent-shortcuts/` and `agent-apps/` shape. The existing `agent-shortcuts` slice is extended in-place for cross-cutting concerns only (the `fetchUnifiedMenu` thunk and a scope-aware selector surface that re-exports the per-resource selectors).
**Rationale:** This mirrors the prevailing pattern in `features/agents/redux/` (each feature gets its own directory). Merging all three resources into a single `agent-shortcuts` slice would violate slice boundaries, create a monolithic state shape, and make later refactors — e.g. moving content blocks into the shared `@matrx/agents` package — destructive. The cost is one extra layer of imports, which is absorbed by a single re-export block in `agent-shortcuts/selectors.ts` so consumers still see one selector surface.
**Consequences:** Two new RootState keys (`agentShortcutCategory`, `agentContentBlock`) must be kept in sync across `lib/redux/rootReducer.ts`, `packages/matrx-agents/src/redux/slices.ts`, and `packages/matrx-agents/src/build-reducer-map.ts`. A shared `features/agents/redux/shared/scope.ts` module owns the `Scope` / `ScopeRef` type + helpers so all three slices index their rows by the same key format (`"${scope}:${scopeId}"`).

### 2026-04-20 — Shortcut category scope model
**Phase:** 1
**Decision:** Categories scope via nullable `user_id` / `organization_id` / `project_id` / `task_id` columns. A row with all nulls is "global" and writable only by admins. Scope precedence at read time: user > org > global (enforced at the view/hook layer, not in RLS).
**Rationale:** Matches the pattern `agx_shortcut` already uses. Keeps RLS simple (visibility), and lets the view/hook express precedence and shadowing (user row with same label as global row wins in UI).
**Consequences:** The agent-context-menu view returns all visible rows; the RTK consumer handles collapsing duplicates by precedence. Document precedence in the view's header comment.

### 2026-04-21 — Shared CRUD components: strict `{ scope, scopeId? }` prop contract
**Phase:** 1 (task 1.7), 11, 12, 13
**Decision:** Every CRUD component under `features/agent-shortcuts/components/` takes `scope: AgentScope` and optional `scopeId?: string` as props — never reads scope from the URL, pathname, or a route segment. The hooks (`useAgentShortcuts`, `useAgentShortcutCrud`) take the same pair and pass it through to RTK thunks/selectors.
**Rationale:** Phases 11 (admin), 12 (user), 13 (org) each mount the same component tree under a different route; the only difference between mounts is the scope pair. Binding scope to the route would force us to duplicate the components three times.
**Consequences:** Admin routes pass `scope="global"`, user routes `scope="user"`, org routes `scope="organization" scopeId={orgId}`. `ShortcutScopePicker` lets admins switch scope without leaving the form. The CRUD hook builds two shapes of RTK payload internally: `{ scope, scopeId }` wrapper for the category/content-block thunks, and `userId/organizationId/projectId/taskId` row fields for the shortcut thunk (which writes directly to the table).

### 2026-04-21 — Mobile form UX: Drawer swap via `useIsMobile()`
**Phase:** 1 (task 1.7)
**Decision:** Every form/modal in `features/agent-shortcuts/components/` renders through `Dialog` on desktop and `Drawer` (vaul bottom-sheet) on mobile, gated by `useIsMobile()` from `@/hooks/use-mobile`. Form body and footer markup is shared — only the outer container swaps.
**Rationale:** CLAUDE.md and `.cursor/skills/ios-mobile-first/SKILL.md` forbid Dialogs on mobile. Splitting each form into a shared body and conditionally rendering Dialog/Drawer is the lowest-duplication path.
**Consequences:** All forms use `text-[16px]` on inputs to prevent iOS zoom, `pb-safe` on drawer footers, and `max-h-[92dvh]` on drawer content. Phases 3 (unified context menu), 7 (chat), 11–13 (route UIs) should follow the same pattern.
