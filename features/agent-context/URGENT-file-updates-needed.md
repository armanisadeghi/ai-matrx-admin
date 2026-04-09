# URGENT — Files likely needing updates (Scope System / Workspace removal)

**Source:** `TODO-URGENT-scope_system_team_instructions.md`  
**Generated:** 2026-04-07  
**Note:** `types/database.types.ts` is treated as already refreshed — keep it in sync if RPC signatures change again. This list focuses on **application code** (no `.md` docs except this inventory).

Below, paths are relative to the repo root: `/Users/armanisadeghi/code/matrx-admin/`.

---

## 1. Direct Supabase: `workspaces` table (table dropped)

These files call `.from('workspaces')` and must be rewritten to scope RPCs / new tables.

| File |
|------|
| `features/context/service/hierarchyService.ts` |
| `features/brokers/services/core-broker-crud.ts` |

---

## 2. Dropped or renamed RPCs and manifest view

| Concern | Files |
|---------|--------|
| `resolve_context_variables` → use `resolve_full_context` (per SQL admin doc) | `features/context/service/contextVariableService.ts` |
| `context_items_manifest` **view dropped** — reads/writes must change (Python may recreate view; until then client queries fail) | `features/context/service/contextService.ts` |
| Broker/context RPCs: remove `p_workspace_id` from args (when types say so) | `features/brokers/services/resolution-service.ts`, `features/brokers/services/core-broker-crud.ts`, `features/brokers/types.ts`, `features/brokers/types/resolution.ts`, `features/brokers/examples/usage.ts` |
| `agx_get_shortcuts_for_context` and related shortcut flows passing workspace | `features/agents/redux/agent-shortcuts/thunks.ts`, `features/agents/redux/agent-shortcuts/types.ts`, `features/agents/redux/agent-shortcuts/converters.ts`, `features/agents/redux/agent-shortcuts/slice.ts` |
| `get_user_nav_tree` / `get_user_full_context` — behaviour/shape may have changed with workspace removal | `features/context/redux/hierarchyThunks.ts`, `features/context/service/hierarchyService.ts`, `features/context/redux/hierarchySlice.ts` |
| `get_user_hierarchy` — return shape may omit workspaces | `components/hierarchy-filter/useHierarchyFilter.ts`, `components/hierarchy-filter/types.ts` (if present), consumers e.g. `features/research/components/landing/TopicList.tsx` |

---

## 3. Redux: navigation tree & app context (`workspace_id`)

| File | Why |
|------|-----|
| `features/context/redux/hierarchySlice.ts` | `NavWorkspace`, flat workspace lists, project↔workspace links |
| `features/context/redux/hierarchyThunks.ts` | Fetches + invalidation tied to old tree |
| `features/context/redux/appContextSlice.ts` | `workspace_id` in app scope |
| `features/context/hooks/useNavTree.ts` | `flatWorkspaces`, `projectsForWorkspace`, `workspace_id` on projects |
| `features/context/hooks/useHierarchy.ts` | `useOrgWorkspaces`, `useWorkspaceProjects`, `useMoveWorkspace`, CRUD |
| `features/context/hooks/useContextScope.ts` | Scope resolution |
| `features/context/index.ts` | Barrel exports for workspace/hierarchy APIs |
| `lib/redux/rootReducer.ts` | Registers hierarchy slice |
| `lib/redux/liteRootReducer.ts` | Comments + `appContext` / hierarchy wiring |
| `lib/redux/slices/overlaySlice.ts` | `workspace_id` on overlay payload types |
| `lib/redux/prompt-execution/thunks/fetchScopedVariablesThunk.ts` | Comments + scoped variable fetch paths |
| `lib/redux/thunks/artifactThunks.ts` | Org/workspace/project/task scope comments + logic |
| `lib/redux/thunks/htmlPageThunks.ts` | `workspaceId` usage |

---

## 4. Context feature — services, types, hooks (scope level `workspace`)

| File |
|------|
| `features/context/types.ts` (`ContextScopeLevel` includes `workspace`) |
| `features/context/service/contextService.ts` |
| `features/context/service/contextVariableService.ts` |
| `features/context/hooks/useContextVariables.ts` |
| `features/context/hooks/useContextItems.ts` |

---

## 5. Context UI — hierarchy / scope / switcher

| File |
|------|
| `features/context/components/HierarchyContextSelector.tsx` |
| `features/context/components/HierarchyContextBar.tsx` |
| `features/context/components/HierarchyMoveModal.tsx` |
| `features/context/components/HierarchyTreePage.tsx` |
| `features/context/components/HierarchyEntityModal.tsx` |
| `features/context/components/HierarchyExplorer.tsx` |
| `features/context/components/ContextSwitcherCore.tsx` |
| `features/context/components/ContextScopeBar.tsx` |
| `features/context/components/ContextTemplateBrowser.tsx` |
| `features/context/components/ContextVariablesPanel.tsx` |
| `features/context/components/ContextEmptyState.tsx` |
| `features/context/components/ContextItemForm.tsx` |
| `features/context/components/ContextItemDetail.tsx` |
| `features/context/components/ContextItemList.tsx` |
| `features/context/components/ContextDashboard.tsx` |
| `features/context/components/ContextAnalytics.tsx` |
| `features/context/components/ContextKanban.tsx` |
| `features/context/components/ContextItemTable.tsx` |
| `features/context/components/ContextItemCard.tsx` |

---

## 6. Shell & global API scope

| File |
|------|
| `features/shell/components/sidebar/SidebarContextSelector.tsx` |
| `lib/api/call-api.ts` | `workspace_id` in scope types and `resolveScope` |

---

## 7. Tasks & projects

| File |
|------|
| `features/projects/components/ProjectsWorkspace.tsx` |
| `features/tasks/components/QuickTasksWorkspace.tsx` |
| `features/tasks/context/TaskContext.tsx` |
| `features/tasks/services/taskService.ts` |
| `features/tasks/components/TaskContentNew.tsx` |
| `features/tasks/components/TaskDetailsPanel.tsx` |
| `app/(authenticated)/projects/page.tsx` | Uses `HierarchyContextBar` / org context |
| `app/(authenticated)/projects/[project-slug]/page.tsx` |
| `app/(authenticated)/projects/[project-slug]/settings/page.tsx` |
| `app/(authenticated)/projects/[project-slug]/settings/layout.tsx` |
| `app/(authenticated)/tasks/page.tsx` |
| `app/(authenticated)/tasks/[id]/page.tsx` |
| `app/(authenticated)/tasks/layout.tsx` |
| `app/(authenticated)/settings/projects/page.tsx` |
| `features/projects/hooks.ts` |
| `features/projects/service.ts` |
| `features/projects/components/ProjectFormSheet.tsx` |
| `features/projects/components/ProjectSettings.tsx` |
| `features/projects/components/InvitationManager.tsx` |
| `features/window-panels/windows/ProjectsWindow.tsx` |
| `features/window-panels/windows/QuickTasksWindow.tsx` |

---

## 8. Organizations & invitations (org-level; verify no workspace columns in queries)

| File |
|------|
| `features/organizations/service.ts` |
| `features/organizations/types.ts` |
| `features/organizations/hooks.ts` |
| `features/organizations/components/OrgSettings.tsx` |
| `features/organizations/components/InvitationManager.tsx` |
| `features/organizations/components/MemberManagement.tsx` |
| `features/organizations/components/OrganizationList.tsx` |
| `app/(authenticated)/organizations/[id]/settings/page.tsx` |
| `app/(authenticated)/organizations/[id]/settings/layout.tsx` |
| `app/(authenticated)/project-invitations/accept/[token]/page.tsx` |
| `app/(authenticated)/invitations/accept/[token]/page.tsx` |
| `app/api/projects/invite/route.ts` |
| `app/api/projects/invitations/resend/route.ts` |
| `app/api/organizations/invite/route.ts` |
| `app/api/organizations/invitations/resend/route.ts` |

---

## 9. Org app routes (`/org/[slug]/...`) — will need scope UX wiring

No workspace string hits today in these route files, but org navigation, settings, and new **`/org/[orgId]/settings/scope-types`** work will touch layouts and chrome.

| File |
|------|
| `app/(authenticated)/org/[slug]/OrgResourceLayout.tsx` |
| `app/(authenticated)/org/[slug]/page.tsx` |
| `app/(authenticated)/org/[slug]/projects/page.tsx` |
| `app/(authenticated)/org/[slug]/projects/[project-slug]/page.tsx` |
| `app/(authenticated)/org/[slug]/projects/[project-slug]/settings/page.tsx` |
| `app/(authenticated)/org/[slug]/projects/[project-slug]/settings/layout.tsx` |
| `app/(authenticated)/org/[slug]/tasks/page.tsx` |
| `app/(authenticated)/org/[slug]/notes/page.tsx` |
| `app/(authenticated)/org/[slug]/files/page.tsx` |
| `app/(authenticated)/org/[slug]/tables/page.tsx` |
| `app/(authenticated)/org/[slug]/prompts/page.tsx` |
| `app/(authenticated)/org/[slug]/prompt-apps/page.tsx` |
| `app/(authenticated)/org/[slug]/templates/page.tsx` |
| `app/(authenticated)/org/[slug]/workflows/page.tsx` |

**New route (per instructions):** `app/(authenticated)/org/[slug]/settings/scope-types/page.tsx` (or equivalent under your org settings structure) — **to be added**, not listed above as existing.

---

## 10. SSR — context engine UI & notes

| File |
|------|
| `app/(ssr)/ssr/context/page.tsx` |
| `app/(ssr)/ssr/context/layout.tsx` |
| `app/(ssr)/ssr/context/templates/page.tsx` |
| `app/(ssr)/ssr/context/analytics/page.tsx` |
| `app/(ssr)/ssr/context/hierarchy/layout.tsx` |
| `app/(ssr)/ssr/context/items/new/page.tsx` |
| `app/(ssr)/ssr/context/items/[itemId]/page.tsx` |
| `app/(ssr)/ssr/context/items/[itemId]/edit/page.tsx` |
| `app/(ssr)/ssr/context/items/[itemId]/history/page.tsx` |
| `app/(ssr)/ssr/notes/_components/ContextSwitcher.tsx` |
| `app/(ssr)/ssr/notes/_components/NotesWorkspace.tsx` |
| `app/(ssr)/ssr/notes/_components/SidebarClient.tsx` |
| `app/(ssr)/ssr/notes/_components/NoteVersionHistory.tsx` |
| `app/(ssr)/ssr/notes/layout.tsx` |
| `app/(ssr)/ssr/notes/page.tsx` |
| `app/(ssr)/ssr/notes/[noteId]/page.tsx` |

---

## 11. Agents & execution (API payloads, shortcuts, broker scope)

| File |
|------|
| `features/agents/redux/execution-system/thunks/execute-instance.thunk.ts` |
| `features/agents/redux/agent-definition/thunks.ts` |
| `features/agents/redux/agent-definition/converters.ts` |
| `features/agents/redux/agent-definition/slice.ts` |
| `features/agents/route/AgentListHydrator.tsx` |
| `features/agents/route/AgentVersionsWorkspace.tsx` |
| `features/agents/components/context-slots-management/AgentContextSlotsManager.tsx` |
| `features/agents/types/agent-definition.types.ts` |
| `features/agents/types/request.types.ts` |
| `features/agents/types/agent-api-types.ts` |
| `features/agents/types/message-types.ts` |
| `types/python-generated/api-types.ts` | Align with Python `AppContext` after they remove `workspace_id` |

---

## 12. Artifacts & miscellaneous

| File |
|------|
| `app/api/artifacts/route.ts` |
| `features/artifacts/types.ts` |
| `features/cx-conversation/components/HtmlPreviewBridge.tsx` |
| `features/cx-dashboard/types/index.ts` |
| `features/prompt-actions/types/index.ts` |
| `components/admin/state-analyzer/stateViewerTabs.tsx` |
| `components/admin/state-analyzer/sliceViewers/agent-definitions/AgentDefinitionSliceViewer.tsx` |
| `components/admin/state-analyzer/sliceViewers/agent-definitions/AgentDefinitionSliceViewerShadcn.tsx` |

---

## 13. Window panels & hierarchy creation

| File |
|------|
| `features/window-panels/windows/HierarchyCreationWindow.tsx` |
| `features/window-panels/windows/ListManagerWindow.tsx` |
| `features/window-panels/windows/NewsWindow.tsx` |
| `features/window-panels/windows/GalleryWindow.tsx` |
| `features/window-panels/windows/AiVoiceWindow.tsx` |
| `features/window-panels/windows/PdfExtractorWindow.tsx` |
| `features/window-panels/windows/ScraperWindow.tsx` |

*(Several grep hits are **component names** only, e.g. `*Workspace.tsx`; include them here only if they embed hierarchy — the windows above import hierarchy/task/project workspaces.)*

---

## 14. Tests, demos, prompts (broker/workspace in examples)

| File |
|------|
| `app/(authenticated)/ai/prompts/experimental/action-test/page.tsx` |
| `app/(authenticated)/ai/prompts/experimental/broker-test/page.tsx` |
| `app/(authenticated)/tests/integrations/simple/constants.tsx` |
| `app/(authenticated)/tests/integrations/simple/mockData.ts` |
| `app/(authenticated)/tests/slack/with-brokers/page.tsx` |
| `app/(authenticated)/tests/slack/with-brokers/components/SlackAuthentication.tsx` |
| `app/(authenticated)/tests/slack/page.tsx` |
| `app/(authenticated)/tests/oauth/page.tsx` |
| `app/(authenticated)/tests/oauth/components/DirectSlackApp.tsx` |
| `app/(authenticated)/tests/applet-tests/applet-builder-3/components/steps/DeployStep.tsx` |

---

## 15. Copy / labels only (low risk; grepMatched "workspace")

Optional product copy updates — **no DB change** unless you rename concepts for users.

| File |
|------|
| `features/public-chat/components/resource-picker/PublicResourcePickerMenu.tsx` |
| `features/cx-chat/components/sidebar/SidebarActions.tsx` |
| `features/organizations/components/MemberManagement.tsx` |
| `config/applets/app-subcategories.ts` |
| `config/applets/app-categories.ts` |
| `constants/audioHelp.ts` |

---

## 16. Explicitly excluded from “must change” (often false positives)

- **Pure filenames:** `features/gallery/components/GalleryFloatingWorkspace.tsx`, `features/pdf-extractor/components/PdfExtractorWorkspace.tsx`, `features/scraper/parts/ScraperFloatingWorkspace.tsx`, etc. — **review only if** they import `appContext` / `workspace_id`.
- **`types/database.types.ts`** — you reported it updated; use as source of truth and fix call sites.
- **`utils/permissions/service.ts`** — comments mention workspace; verify RPCs still match permission model.

---

## 17. Suggested implementation order

1. **`hierarchyService` + `hierarchySlice` + `hierarchyThunks` + `useNavTree` / `useHierarchy`** — restore a working org → **scope** → project mental model.  
2. **`appContextSlice` + `call-api.ts`** — remove `workspace_id` from client scope; align with Python.  
3. **`contextService` / manifest** — unblock context SSR routes.  
4. **`contextVariableService`** — switch to `resolve_full_context` (or typed successor).  
5. **Brokers + agent shortcuts** — drop `p_workspace_id`.  
6. **Tasks / projects UI** — replace workspace picker with **scope picker** (`set_entity_scopes`, `get_entity_scopes`, `list_scopes`, `get_org_structure`).  
7. **New org settings route** — scope type manager.  
8. **Sweep** — labels, tests, admin viewers.

---

**Total unique code files listed above:** on the order of **150+** paths (including route variants and components). Use this file as a checklist; trim sections that your team confirms are already migrated.
