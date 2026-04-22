# FEATURE.md — `scope-system`

**Status:** `active` — core architecture; the broker hierarchy is production; some features are mid-migration to full multi-scope
**Tier:** `1` (meta / architectural)
**Last updated:** `2026-04-22`

> This is an **architectural meta-doc**, not a feature dir with code. It ties together how organizations, workspaces, projects, tasks, users, shares, and AI runs/tasks compose into a single access + context model. Every Tier 1 feature participates in this system.

---

## Purpose

One model answers the questions: *Who can see this? Which scope does this belong to? What variables resolve here? How do features compose across user/org/project/task boundaries?* Getting this right is the difference between a clean codebase and a tangled one.

---

## The scope hierarchy

```
Global
  └─ User
       └─ Organization
             └─ Workspace                  (nests within org)
                   └─ Project
                         └─ Task
                               └─ AI Run
                                     └─ AI Task
```

| Level | Role | Primary table / identifier |
|---|---|---|
| **Global** | platform-wide defaults, flags | implicit / broker-only |
| **User** | individual account | `users` / `user_id` |
| **Organization** | multi-tenant boundary; billing unit | `organizations` / `organization_id` (slug in routes) |
| **Workspace** | multi-project grouping within an org | `workspaces` / `workspace_id` (nests in org) |
| **Project** | work unit; owns tasks | `projects` / `project_id` |
| **Task** | unit of work; owns runs | `tasks` / `task_id` |
| **AI Run** | a single agent conversation | `cx_conversation` / `conversation_id` |
| **AI Task** | a fine-grained per-turn unit within a run | `ai_task_id` |

The first six are **structural** (users, orgs, projects, tasks). The last three are **execution** scopes used by agents + brokers for per-invocation resolution.

Canonical client state: `lib/redux/slices/appContextSlice.ts` holds the active `organizationId / workspaceId / projectId / taskId`. Injected into every API call by `assembleRequest()`. Stamped onto `cx_conversation.organization_id / project_id / task_id` server-side.

---

## Many-to-many relationships

The scope tree is a **containment tree** (each level has one parent) but many real-world relationships are M2M:

| Relationship | Shape |
|---|---|
| User ↔ Organization | M2M via `organization_members` (user belongs to many orgs, org has many users) |
| User ↔ Project | M2M via invitations (user can be added to projects across orgs) |
| User ↔ Task | M2M via assignments / watchers |
| Project ↔ Organization | N:1 (a project belongs to one org) |
| Task ↔ Project | N:1 |
| Resource ↔ Any scope | M2M via `permissions` (sharing is orthogonal to scope ownership) |
| Broker value ↔ Scope levels | 1:many (same key declared at multiple levels; nearest wins) |

---

## Feature-to-scope matrix

Every major feature declares which scope levels it can be owned by. Scope columns on the feature table are `user_id / organization_id / project_id / task_id` — nullable where the feature doesn't belong to that level.

| Feature | User | Org | Project | Task | Notes |
|---|:-:|:-:|:-:|:-:|---|
| Agents | ✅ | ✅ | — | — | personal + org-owned |
| Agent Shortcuts | ✅ | ✅ | ✅ | ✅ | **multi-scope from day one** — canonical example |
| Agent Apps | ✅ | ✅ | ✅ | ✅ | same scope model as Shortcuts |
| Notes | ✅ | ✅ | ✅ | — | shareable across all |
| Projects | — | ✅ | — | — | owned by org |
| Tasks | — | — | ✅ | — | owned by project |
| Conversations (`cx_conversation`) | ✅ | ✅ | ✅ | ✅ | stamped with full scope chain |
| Brokers | all levels | all levels | all levels | all levels | hierarchical resolution |
| Sharing permissions | cross-cuts | cross-cuts | cross-cuts | cross-cuts | orthogonal to scope |

Scope fields are **additive**: `user_id` + `organization_id` + `project_id` + `task_id` together pinpoint a row. Null means "not scoped here" — e.g. a personal shortcut has `organization_id: null`.

---

## Key flows

### Flow 1 — User creates an org

1. User → new org → becomes owner (`organization_members` row, role `owner`).
2. Invites members via `features/invitations/`.
3. Members invited to specific projects / tasks within.

### Flow 2 — Resource creation stamps scope

1. User creates a shortcut in the "My Org / Project Alpha" context.
2. Row inserted with `user_id: me`, `organization_id: <alpha's org>`, `project_id: alpha`, `task_id: null`.
3. RLS uses these columns to gate read/write.

### Flow 3 — Broker resolution

1. Agent declares context slot `org_brand_voice`.
2. At invocation, broker resolver walks the chain: AI task → AI run → task → project → workspace → org → user → global.
3. First non-null value wins. Server stamps the conversation with the resolved scope.

### Flow 4 — Sharing is orthogonal

1. User A owns a note scoped to their personal space.
2. User A shares to User B via `features/sharing/` — one row in `permissions`, references the note + target user.
3. User B reads the note (RLS allows because of the permission row), even though scope-ownership columns belong entirely to User A.

### Flow 5 — Switching active scope in the UI

1. User picks a different project in the UI. `appContextSlice` updates.
2. All queries re-fire with the new scope. Lists filter. Brokers re-resolve.
3. Next agent invocation carries the new scope.

---

## Invariants & gotchas

- **Scope fields are additive, not hierarchical shortcuts.** Don't infer `project_id` from `task_id` client-side — always carry both.
- **Null = not scoped here**, not "scoped to global." Everywhere you write scope, set every level you care about.
- **Nearest broker scope wins.** Set brokers at the correct level — wrong-level declarations are silently misleading.
- **RLS is the enforcement layer.** UI-level scope filtering is for UX only. Never assume the client hides every forbidden row.
- **Sharing is orthogonal.** Scoping a resource to your personal account does not prevent it being shared. Owners always control share grants.
- **Org slugs are URL-unique.** Renaming an org's slug breaks bookmarks.
- **The scope chain on `cx_conversation`** is stamped at first-turn time. Subsequent turns inherit.
- **Don't invent per-feature scope state.** Always extend `appContextSlice` + brokers.

---

## Related features (every Tier 1)

- [`features/agents/FEATURE.md`](../agents/FEATURE.md) — agent invocations stamped with scope
- [`features/agent-shortcuts/FEATURE.md`](../agent-shortcuts/FEATURE.md) — canonical multi-scope consumer
- [`features/agent-apps/FEATURE.md`](../agent-apps/FEATURE.md) — multi-scope
- [`features/agent-context/FEATURE.md`](../agent-context/FEATURE.md) — brokers + context slots (the resolution mechanics)
- [`features/sharing/FEATURE.md`](../sharing/FEATURE.md) — orthogonal permissions
- [`features/organizations/FEATURE.md`](../organizations/FEATURE.md) — org primitive + invitations
- [`features/tasks/FEATURE.md`](../tasks/FEATURE.md) — tasks + projects
- [`features/notes/FEATURE.md`](../notes/FEATURE.md) — multi-scope shareable
- [`features/projects/CONCEPT-scope-system-redux-architecture.md`](../projects/CONCEPT-scope-system-redux-architecture.md) — the seed doc this meta-doc extends

---

## Change log

- `2026-04-22` — claude: initial scope-system meta-doc.

---

> **Keep-docs-live:** changes to scope levels, scope columns on any major feature, broker resolution rules, or the sharing-vs-scope boundary must update this doc. Updates to individual feature scope models must also update this doc's Feature-to-scope matrix.
