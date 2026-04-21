# Phase 1 — Agent Shortcuts Foundation

**Status:** in-progress
**Owner:** _unassigned_
**Prerequisites:** Phase 0 (governance docs exist)
**Unblocks:** Phases 2, 3, 11, 12, 13

## Progress

- [x] **1.1** — Scope columns on `shortcut_categories` + scope helper functions. File: `migrations/scope_columns_on_shortcut_categories.sql`.
- [x] **1.2** — Scope columns on `content_blocks` (existing table extended, not a new table — see `DECISIONS.md`). File: `migrations/scope_columns_on_content_blocks.sql`.
- [x] **1.3** — `agent_context_menu_view` + scope-aware RLS on `agx_shortcut`. Files: `migrations/create_agent_context_menu_view.sql`, `migrations/scope_rls_on_agx_shortcut.sql`.
- [x] **1.4** — RLS smoke tests (pre-flight checks for helpers, columns, policies, view). File: `migrations/tests/agent_shortcuts_rls_tests.sql`. Full per-role tests pending test fixtures.
- [ ] **1.5** — RTK extensions for categories + content blocks + unified-menu thunk
- [ ] **1.6** — REST API routes
- [ ] **1.7** — `features/agent-shortcuts/` shared CRUD feature directory
- [ ] **1.8** — Unit tests for `scope-mapping.ts`
- [ ] **1.9** — Regenerate `types/database.types.ts` + doc sweep

## Goal

Build the complete backend + RTK + shared-CRUD-component foundation for agent shortcuts, categories, and content blocks — **scope-aware from day one** (admin / user / org). No UI routes are mounted in this phase; those come in Phases 11–13 and reuse the components built here.

Why this is Phase 1: every subsequent migration phase — context menu, quick actions, user/org shortcut UIs, applets — is a consumer of this foundation. If the shape of the foundation changes later, everything downstream rebreaks.

## Success criteria

A feature is done when **all** of these hold:

- [ ] `shortcut_categories` table has `user_id`, `organization_id`, `project_id`, `task_id` columns with RLS respecting them.
- [ ] A new `agent_content_blocks` table (or equivalent — see task 1.2) exists with the same scope columns and RLS.
- [ ] A DB view `agent_context_menu_view` returns shortcuts + categories + content blocks visible to `auth.uid()` across all three scopes, respecting `placement_type` and `enabled_contexts`. Replaces `context_menu_unified_view` for agent consumers.
- [ ] `features/agents/redux/agent-shortcuts/` slice has thunks + selectors for **shortcuts, categories, and content blocks**, each operating at admin/user/org scope.
- [ ] REST endpoints exist at `/api/agent-shortcuts`, `/api/agent-shortcut-categories`, `/api/agent-content-blocks` with proper scope guards.
- [ ] `features/agent-shortcuts/` feature directory exists and exports **reusable, scope-agnostic** CRUD components (not mounted to any route yet).
- [ ] `mapScopeToVariables` is ported to `features/agent-shortcuts/utils/scope-mapping.ts` as `mapScopeToAgentVariables` and covered by unit tests.
- [ ] Legacy `features/prompt-builtins/` and `features/context-menu/` are **unchanged** (deletion is Phase 18).
- [ ] `INVENTORY.md` has been updated if any new prompt-adjacent surface was discovered.
- [ ] This doc's **Change Log** at the bottom has the final entry.

## Out of scope (explicitly)

- Any UI route under `(admin-auth)`, `/agents/shortcuts`, or `/org/[slug]/shortcuts` — those are Phases 11/12/13.
- Any change to `features/context-menu/UnifiedContextMenu.tsx` or its hook — Phase 3.
- Any change to `useQuickActions` — Phase 4.
- Any deletion of prompt-builtins code — Phase 18.

---

## Task breakdown

### 1.1 — Schema: scope columns on `shortcut_categories`

**File:** new Supabase migration under `supabase/migrations/` (match current naming convention).

**SQL:**
```sql
alter table public.shortcut_categories
  add column user_id uuid references auth.users(id) on delete cascade,
  add column organization_id uuid references public.organizations(id) on delete cascade,
  add column project_id uuid references public.projects(id) on delete cascade,
  add column task_id uuid references public.tasks(id) on delete cascade;

create index on public.shortcut_categories(user_id);
create index on public.shortcut_categories(organization_id);
```

**RLS:** existing admin-only policy stays. Add:
- `SELECT` where `user_id = auth.uid()` OR user is in `organization_members` for `organization_id`.
- `INSERT/UPDATE/DELETE` where `user_id = auth.uid()` OR user has the `org_admin` role for `organization_id`.
- Global (all-scope-null) rows remain admin-only write, public read.

**Verify:** regenerate `types/database.types.ts`.

### 1.2 — Schema: content blocks

**Decision required before starting:** do content blocks get their own `agent_content_blocks` table, or become a `placement_type = 'content_block'` row on `agx_shortcut`?

Default recommendation: **own table** — content blocks have different semantics (insertable templates, no execution, no variables). Separate table keeps `agx_shortcut` focused on executable shortcuts.

If decision is "own table," migration:
```sql
create table public.agent_content_blocks (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.shortcut_categories(id) on delete set null,
  label text not null,
  description text,
  content text not null,
  icon_name text,
  sort_order integer default 0,
  is_active boolean default true,
  user_id uuid references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Same three-scope RLS as shortcut_categories in 1.1.
```

Log the decision in `DECISIONS.md` before writing the migration.

### 1.3 — Schema: unified view

Create `agent_context_menu_view` that returns:
- every `agx_shortcut` row visible to the caller
- every `agent_content_blocks` row visible to the caller
- joined to `shortcut_categories` for grouping

With columns: `id`, `type` (`'shortcut' | 'content_block'`), `category_id`, `category_label`, `category_placement_type`, `label`, `description`, `icon_name`, `sort_order`, `scope` (`'global' | 'user' | 'organization' | 'project' | 'task'`), plus all the fields current `shortcuts_by_placement_view` returns (`auto_run`, `allow_chat`, `result_display`, `scope_mappings`, `enabled_contexts`, `keyboard_shortcut`, `agent_id`, `agent_version_id`, `use_latest`, `show_variables`, `apply_variables`, `use_pre_execution_input`).

Model the visibility precedence as a view-level CTE: user-scope overrides org-scope overrides global. Document the precedence in a comment at the top of the view DDL.

### 1.4 — RLS smoke tests

Write a SQL test script under `supabase/tests/agent-shortcuts-rls.sql` covering:
- admin sees everything
- user sees only their own + their orgs' + global
- user cannot write to another user's rows
- org admin can write to org-scoped rows
- non-admin cannot write global rows

### 1.5 — RTK: extend `features/agents/redux/agent-shortcuts/`

Current shape (from inventory): `slice.ts`, `selectors.ts`, `thunks.ts`, `converters.ts`, `types.ts`. Extend, do not parallel-create.

Additions:
- **Categories sub-resource** in the slice: `categoriesById`, `categoryIdsByScope` (`{ global, user, org[orgId] }`).
- **Content blocks sub-resource** in the slice: `contentBlocksById`, `contentBlockIdsByScope`.
- **Thunks**:
  - `fetchShortcutsForScope({ scope, scopeId? })`
  - `createShortcut({ scope, ...payload })` / `updateShortcut` / `deleteShortcut`
  - Same trio for categories and content blocks
  - `fetchUnifiedMenu({ scope })` — hits the new view, populates all three sub-resources atomically
- **Selectors**: scope-aware — `selectShortcutsByScope(state, scope, scopeId?)`, `selectCategoryTreeByScope`, etc. All `createSelector`-memoized.
- **Converters**: extend `converters.ts` to handle the new view shape.

No business logic outside RTK — see CLAUDE.md.

### 1.6 — REST API

New routes under `app/api/`:
- `api/agent-shortcuts/route.ts` — GET (list, scope query param), POST
- `api/agent-shortcuts/[id]/route.ts` — GET, PATCH, DELETE
- `api/agent-shortcut-categories/route.ts` + `[id]/route.ts`
- `api/agent-content-blocks/route.ts` + `[id]/route.ts`
- `api/agent-context-menu/route.ts` — GET, returns the unified view for a scope (used by Phase 3)

Scope handling:
- `?scope=global` → requires admin
- `?scope=user` → returns caller's rows
- `?scope=organization&organizationId=...` → requires caller is a member; write requires `org_admin`

Use `createClient` from `@/utils/supabase/server` with RLS — do **not** use admin client unless specifically writing global rows that require bypass (they shouldn't; global rows are admin-written via normal client with admin role).

### 1.7 — Shared CRUD feature directory

Create `features/agent-shortcuts/`:

```
features/agent-shortcuts/
├── README.md                 # only after first component is tested
├── index.ts
├── types.ts                  # re-export RTK types, add any UI-local types
├── constants.ts              # PLACEMENT_TYPES, icon presets, etc. (port from prompt-builtins/constants.ts, de-prompt names)
├── components/
│   ├── ShortcutList.tsx              # table with sort/filter; scope prop selects which rows
│   ├── ShortcutForm.tsx              # create/edit form; handles all fields from agx_shortcut
│   ├── ShortcutScopePicker.tsx       # admin-only widget: assign scope
│   ├── CategoryTree.tsx              # hierarchical display with parent_category_id
│   ├── CategoryForm.tsx
│   ├── CategoryColorPicker.tsx       # port from prompt-builtins
│   ├── ContentBlockList.tsx
│   ├── ContentBlockForm.tsx
│   ├── ScopeMappingEditor.tsx        # port from prompt-builtins/components/ScopeMappingEditor.tsx
│   ├── DuplicateShortcutModal.tsx    # port from prompt-builtins/components/
│   ├── LinkAgentToShortcutModal.tsx  # replaces LinkBuiltinToShortcutModal
│   └── index.ts
├── hooks/
│   ├── useAgentShortcuts.ts          # read-side orchestration
│   └── useAgentShortcutCrud.ts       # dispatches thunks, returns mutation helpers
└── utils/
    ├── scope-mapping.ts              # port mapScopeToVariables → mapScopeToAgentVariables
    ├── menu-hierarchy.ts             # port menuHierarchy.ts, agent-shaped
    └── validation.ts                 # port validation.ts
```

Components must:
- Accept `scope` + `scopeId?` props. Do not infer from route.
- Use RTK hooks (`useAppSelector`, `useAppDispatch`) — never local fetch.
- Use design tokens (`bg-card`, `text-foreground`, etc.).
- Follow mobile rules (`features/agents/` patterns; Drawer on mobile, not Dialog).

### 1.8 — Unit tests

For `scope-mapping.ts` specifically, port the existing test coverage from `features/prompt-builtins/utils/execution.ts` tests (if any) and re-implement with agent variable shape. If there are none, write new ones — this utility sits in the hot path for every context-menu execution.

### 1.9 — Documentation updates

Before closing this phase:
- [ ] Update `MASTER-PLAN.md` status from `not-started` → `complete`.
- [ ] Append to `INVENTORY.md` anything discovered that was not listed.
- [ ] Add `DECISIONS.md` entry for the content-blocks table-vs-placement decision (1.2).
- [ ] Fill this doc's Change Log below.
- [ ] Add an entry to `features/agents/migration/phases/phase-02-content-blocks.md` describing hand-off (if task 1.2 chose table-vs-placement in a way that affects Phase 2 scope).

---

## First task to ship today

**Task 1.1** (schema migration for `shortcut_categories`) is the smallest independent unit and unblocks everything else. One pull request, one migration file, one regenerated types file, one RLS test. Open it first; get it reviewed; then pick up 1.2.

## Run order (for whoever applies these migrations)

```
1. migrations/scope_columns_on_shortcut_categories.sql   (creates helpers + cols)
2. migrations/scope_columns_on_content_blocks.sql        (uses helpers)
3. migrations/scope_rls_on_agx_shortcut.sql              (uses helpers)
4. migrations/create_agent_context_menu_view.sql         (uses tables from 1–3)
5. migrations/tests/agent_shortcuts_rls_tests.sql        (verification — idempotent, rolls back)
```

After applying, run `npm run types` to regenerate `types/database.types.ts`.

## Change log

| Date | Who | Change |
|---|---|---|
| 2026-04-20 | initial plan | Phase created |
| 2026-04-20 | main agent | Tasks 1.1–1.4 shipped: 4 migrations + RLS pre-flight test. Helpers `is_platform_admin`, `is_org_admin`, `is_org_member` added. Content-blocks decision landed in DECISIONS.md (extend existing table, not parallel). `agx_shortcut` RLS rewritten scope-aware — required because the view relies on row-level visibility at the source tables. |
