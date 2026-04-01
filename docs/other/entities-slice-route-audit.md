# Entities Slice — Route Usage Audit

# /Users/armanisadeghi/code/matrx-admin/docs/TOOL-WEB-VIEW-ANTHROPIC.md

**Goal:** Eliminate the entities Redux slice from all routes except those that absolutely need it. This doc tracks which routes use the entity system so you can lazy-inject entity reducers only for those trees.

**What counts as "uses entities":** Any route that (or a component in its tree that) imports from `@/lib/redux/entity/*`, uses `useEntitySystem`, or renders entity UI from `@/components/matrx/Entity` or `@/app/entities/` in a way that touches entity state (selectors, hooks, getEntitySlice, etc.).

---

## Routes that USE the entities system

Once a route is confirmed with one example, it is listed here. No need to enumerate every file on that route.

| Route (segment or path) | Example of usage |
|-------------------------|------------------|
| **Entity CRUD (main entity UI)** | |
| `/entity-crud` | `EntityDirectory` — `app/(authenticated)/entity-crud/page.tsx` |
| `/entity-crud/[entityName]` | `EntityRecordServerWrapper`, `EntityRecordHeader` — `app/(authenticated)/entity-crud/[entityName]/page.tsx` |
| `/entity-crud/[entityName]/[primaryKeyField]` | `useQuickReference(params.entityName)` — `app/(authenticated)/entity-crud/[entityName]/[primaryKeyField]/page.tsx` |
| `/entity-crud/[entityName]/[primaryKeyField]/[primaryKeyValue]` | `EntityRecordServerWrapper`, `EntityRecordHeader` — same folder `page.tsx` |
| **Entities admin** | |
| `/entities/admin` | `EntityDirectory` — `app/(authenticated)/entities/admin/page.tsx` |
| `/entities/admin/[entity]` | `ArmaniLayout` in `EntityPageClient` — `app/(authenticated)/entities/admin/[entity]/EntityPageClient.tsx` |
| **Workflow (entity-backed)** | |
| `/workflow-entity` | `ArmaniLayout` — `app/(authenticated)/workflow-entity/page.tsx` |
| **Chat (entity-backed conversation/messages)** | |
| `/chat` | Chat uses `createChatSelectors`, `getChatActionsWithThunks` in `features/chat` (ResponseColumn, ClientHeaderContent, useChatBasics, etc.) |
| `/chat/[id]` | Same chat components in tree |
| **Admin (entity tabs)** | |
| `/admin` | When "Entity Testing Lab" or "Entity Browser" tab is selected — `admin/constants/categories.tsx` mounts `EntityTestingLab`, `EntityBrowser` (useEntity, useQuickReference, EntityCardHeaderSelect) |
| **Tests / demos (entity-specific)** | |
| `/tests/forms/entity-final-test` | `MergedEntityLayout` — `app/(authenticated)/tests/forms/entity-final-test/page.tsx` |
| `/tests/forms/single-entity` | `SingleEntityLayout` — `app/(authenticated)/tests/forms/single-entity/page.tsx` |
| `/tests/forms/entity-form-basic-container` | `useEntity`, `PreWiredEntityRecordHeader` — page.tsx |
| `/tests/forms/entity-management` | `EntityPageClient` → `ArmaniLayout` — EntityPageClient.tsx |
| `/tests/forms/entity-management-smart-fields` | `EntitySmartLayout` — page.tsx |
| `/tests/forms/entity-smart-armani-fields` | `EntitySmartLayout` — page.tsx |
| `/tests/advanced-data-table` | `PreWiredCardHeader`, `AdvancedDataTable` — page.tsx |
| `/tests/dynamic-entity-test` | `createEntitySelectors`, `getEntitySlice` — page.tsx |
| `/tests/dynamic-entity-test/basic-table` | `createEntitySelectors`, `getEntitySlice` — page.tsx |
| `/tests/relationship-management/metadata-test` | `getFullEntityRelationships`, `getEntityMetadata`, local `EntityHeader` — page.tsx, info-cards.tsx |
| `/tests/relationship-management/entity-json-builder` | `EntityJsonBuilderWithSelect` (useEntityTools, EntitySelection) — page.tsx |
| `/tests/relationship-management/entity-json-builder/async-sequential-create` | `EntityJsonBuilderWithSelect` — page.tsx |
| `/tests/relationship-management/entity-json-builder/async-direct-create` | `EntityJsonBuilderWithSelect` — page.tsx |
| `/tests/relationship-management/rel-with-fetch-test` | `EntityJsonBuilder` uses `useEntityTools` — EntityJsonBuilder.tsx |
| `/tests/dynamic-layouts/grid-demo/email-app-demo` | `EmailContent` (createEntitySelectors), `EmailList` (useQuickReference) — EmailContent.tsx, EmailList.tsx |
| `/demo/many-to-many-ui/grok/quick-tester` | `useCreateManyToMany` — page.tsx |
| `/demo/many-to-many-ui/grok-modular/...` | `DynamicRelationshipMaker` uses `useCreateManyToMany` — DynamicRelationshipMaker.tsx |
| `/demo/component-demo/entity-select-demo` | Entity options from `@/components/matrx/Entity` — page.tsx |
| `/demo/component-demo/entity-select-demo/selection-demo-two` | Entity options — page.tsx |
| **Other app routes that pull in entity code** | |
| `/admin/components/entities/*` | EntityHeader, EntityBrowser, EntityTestingLab, EntityTester, EntityMetrics, EntityLab (useEntity, useQuickReference, createEntitySelectors, etc.) — used when admin category renders these |
| Schema visualizer | Links to `/entity-crud/${entityName}` — `admin/components/SchemaVisualizer/SchemaDetails.tsx` (does not itself use entity slice; just navigates) |

---

## Shared components that use entities (used by multiple routes)

- **features/chat** — `createChatSelectors`, `getChatActionsWithThunks`. Any route that renders the main chat UI (e.g. `/chat`, `/chat/[id]`) uses the entity system for conversation/message state.
- **components/admin/controls/MediumIndicator** — chat actions/selectors; used in admin/indicator contexts.
- **components/mardown-display** — MarkdownAnalyzer, QuestionnaireRenderer use chat selectors/actions; any route that renders these uses entities for chat.

---

## Routes confirmed NOT to use entities (sample)

These routes have no `app/`-level imports from `@/lib/redux/entity` or entity-specific components in their page/layout. They do not render entity-crud, entities/admin, entity tests, or chat. (If they later add entity-backed features, re-check.)

| Route | Note |
|-------|------|
| `/tasks` | No entity imports in app tree for tasks page. |
| `/notes` | No entity imports in app tree for notes list/detail. |
| `/files/*` | No entity imports in app tree for files routes. |
| `/flashcard`, `/flash-cards/*` | No entity imports in app tree. |
| `/prompt-apps/new`, `/prompt-apps/*` | No entity imports in app tree (prompt-apps feature). |
| `/ai/prompts/*` | No entity imports in app tree for prompts. |
| `/workflows-new/*` | No entity imports in app tree (workflow-nodes slice is separate from entity slice). |
| `/apps/*`, `/apps/app-builder/*` | No entity imports in app tree for app list/builder. |
| `/sandbox` | No entity imports in app tree. |
| `/image-editing` | No entity imports in app tree. |
| `/remirror-editor` | No entity imports in app tree. |
| `/messages/[conversationId]` | Verify: may use conversation slice only (cx-conversation); if it does not use features/chat or entity chat selectors, it does not use entities. |
| `/org/[slug]/*` | No entity imports in app tree for org pages. |
| `/projects/[project-slug]/*` | No entity imports in app tree. |
| Public routes `(public)/*`, `(ssr)/*`, `auth/*` | No entity usage; often use lite root reducer. |

*You can expand this “confirmed no” list by grepping each route’s `page.tsx` and `layout.tsx` for `@/lib/redux/entity` and `@/components/matrx/Entity` and `@/app/entities/`.*

---

## Summary

- **Entity-heavy route trees:** `/entity-crud`, `/entities/admin`, `/workflow-entity`, and all `/tests/...` and `/demo/...` paths listed above.
- **Critical product routes that use entities:** `/chat`, `/chat/[id]`, `/admin` (when entity tabs are open).
- **Many authenticated routes** (notes, tasks, files, prompt-apps, app-builder, workflows-new, etc.) show no direct entity usage in `app/` and are good candidates for not loading the entities slice once you split the store.

---

## How to use this for lazy entity reducers

1. Keep the **lite root reducer** (no `entities` key) as the default for authenticated layout.
2. Wrap only the route trees that **use entities** (e.g. entity-crud, entities/admin, workflow-entity, chat, admin when on entity tabs, and test/demo entity routes) with a provider that either:
   - uses a store that includes injected entity reducers, or
   - calls `useEntitySystem()` and injects entity reducers into the existing store when entering those routes.
3. Ensure **EntityPack** (or equivalent) wraps only those trees so `useEntitySystem` and entity reducers run only there.

---

*Last updated: 2025-03-18. Re-run audit when adding new entity-backed features or routes.*
