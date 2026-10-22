---
type: Reference
title: "Primitives Index — what this repo already has"
description: "The searchable index of matrx-frontend's shared primitives (Need → Use → Location). The reuse-first rules live in common-docs/policies/reuse-first.md."
---

# READ FIRST: what we already have

The rules are the cross-repo law [reuse first](../../common-docs/policies/reuse-first.md): search
before you write; reuse, then extend in place, then compose, then create (only as a shared
primitive); extending a shared piece is expected; name what you searched in your report. This
file is where you search first in this repo.

## Primitives Index

<!-- Keep this current. Agents cannot reuse what they cannot find.
     Guarded: `pnpm check:reuse-index` fails (:strict) on any path that no longer exists.
     First batch = high-reuse platform primitives only.
     Skip: shadcn/ui (`components/ui/*`), `cn`, Redux hooks, Supabase clients.
     Format: Need → Use → Location -->

### Components — inputs & text

| If you need to… | Use | Located at |
| --- | --- | --- |
| Long-form text input (voice, stats, agent hooks) | `ProTextarea` | `components/official/ProTextarea.tsx` |
| Single-line labeled input | `ProInput` | `components/official/ProInput.tsx` |
| Agent chat / run input (all surfaces) | `SmartAgentInput` | `../aidream/apps/shared/chat/src/agents/components/inputs/smart-input/SmartAgentInput.tsx` |
| Let a person CHOOSE an agent (any surface) — tabs, counts, sort, favorites, category/tag filters, search, pinned row. THE ONE PICKER, and it lives in the **@ai-matrx/agents/catalog/react** package | `AgentListDropdown` / `AgentListInlinePicker` | mounted once by `providers/AgentCatalogHost.tsx` (catalog built in `lib/agents/catalog.ts`); rule + registry contract in `features/agents/FEATURE.md`; guards `scripts/check-canonical-pickers.ts` + `scripts/check-agent-list-reads.ts` |
| Compact active-context picker (popover/menu) | `ActiveContextTree` (+ `ContextTree`) | `features/scopes/components/active-context/ActiveContextTree.tsx` |
| Pick or create a project (complete searchable list) | `ProjectPicker` | `features/projects/components/ProjectPicker.tsx` |
| Overflow / hierarchical action menu | `AdvancedMenu` | `components/official/AdvancedMenu.tsx` |
| **Name another record anywhere** (cell, row, dialog, badge) — open / new tab / peek. THE DOOR LAW: never a bare `<span>` or UUID. Two props carry the decisions it can't make for you: `openInNewTab` on anything embedded (rail, sheet, panel, audit) so following a record can't cost the user what they're in, and `href` to override the registry on an `(admin)`/`(dev)` surface, where a `(core)` route is a **different origin** and bounces off the console. Where the id itself is the information, pass it as `name` **plus `wrap`** — it truncates by default (its home is a table cell), which silently eats the thing an admin came to copy. Safe to drop inside a clickable row: the controls AND the portaled peek both stop propagation (React events travel the React tree, so a portal alone does not isolate them). Replacing a FULL-WIDTH control? Add `fill` — `className="flex-1"` stretches only the wrapper, so the label stops opening the record everywhere the old button's padding used to. Styling that must land on the TEXT (`line-through`, weight) goes in `labelClassName`, not `className`. Name is JSX, not a string (title + badge, title over subtitle)? Pass it as CHILDREN — a surface that can't be flattened is how a shell ends up building its own poorer door | `EntityRef` | `components/official/entity-ref/EntityRef.tsx` |
| Render an AI-model or built-in-tool FK. These references resolve active AND historical/deactivated rows, never expose a UUID as the identity label, and can retain the complete ID beneath the name with `showId` for version/audit surfaces. Use `disableNavigation` only when nested inside another interactive control | `AiModelRef` / `AiToolRef` | `@ai-matrx/chat/agents/components/identity-refs/AiIdentityRef` |
| Ask whether a kind has a registered peek (without pulling all 19 peeks into your chunk), and translate a canonical token to its peek key — **six differ**, and keying off the token loses the peek for exactly those six | `hasPeek` + `peekKeyForToken` + `ResourcePeekHost` | `features/organizations/peek/kinds-list.ts`, `features/organizations/peek/ResourcePeekHost.tsx` |
| Turn a `kind` / `type` string written by ANOTHER system (an ingest pipeline, a stream envelope, a legacy catalog) into a canonical entity token before you resolve a route or a peek. **A column named `kind` is not a token**: `source_kind='cld_file'` is the registry's `file` — same row, same id, same route — but handed over raw it renders doorless while `note`/`task` on the same screen work, which is the most deceptive possible failure. Canonicalise ONCE and carry that token to both doors; resolving the entity from the canonical string and the peek from the raw one is the exact split this exists to stop. Add a new alias here and nowhere else, and only after verifying it points at the same physical row | `resolveEntityToken` (+ `tryGetEntityInfo`, which canonicalises for you) | `features/scopes/registry/entityRegistry.ts` |
| An agent's parent / children / system twin (derived, no query) | `selectAgentLineageIndex` / `selectAgentLineage` | `../aidream/apps/shared/chat/src/agents/redux/agent-definition/selectors.ts` |
| Run an agent headlessly and get its extracted JSON (one-shot, optional file/audio message parts) — NEVER hand-roll launch+poll (D126) | `useHeadlessAgentJson` (React) / `runHeadlessAgentJson` (thunk-style) | `../aidream/apps/shared/chat/src/agents/hooks/useHeadlessAgentJson.ts`, `../aidream/apps/shared/chat/src/agents/redux/execution-system/thunks/run-headless-agent-json.ts` |
| Resolve Lucide / custom icon by name | `IconResolver` | `@ai-matrx/icons` |
| Render a 0–100 score as an accessible SVG ring with domain-specific good/warning thresholds | `ScoreRing` | `@ai-matrx/design-system` (npm) |
| 44×44 icon tap targets | `TapTargetButton` + `tap-buttons` | `@ai-matrx/design-system/tap-target`, `@ai-matrx/design-system/tap-target/buttons` |
| Single-value picker over a `platform.categories` dimension (FK columns) | `CategorySelect` | `@ai-matrx/associations/react` |
| Tag an entity with categories via association edges (multi-select + inline create) | `CategoryTagPicker` | `@ai-matrx/associations/react` |

### Components — lists, rows & record actions

Building a feature's list page, a row menu, or "what can I do to this record?"
Start here — there are ~26 bespoke list pages in the repo and that is the defect
this section exists to stop. Campaign: `docs/handoffs/inventory-law-sweep.md`.

| If you need to… | Use | Located at |
| --- | --- | --- |
| **A feature's list page** — table/cards/dense, Mine/My Orgs/Shared/Public scopes with true server counts, facets, column picker, inline edit. Write a config, never a bespoke table | `EntityListPage` + `EntityListConfig` | `lib/entity-list/components/EntityListPage.tsx`, `lib/entity-list/config.tsx` — see `lib/entity-list/FEATURE.md`; best consumer `features/agents/browse/` |
| Declare a list column (sorts AND filters server-side — no exceptions) | `EntityColumnSpec` (+ `relativeTime` / `timeCell`) | `lib/entity-list/columns.tsx` |
| A list column that NAMES a record — give it `entityToken` and the shell renders the cell through `EntityRef` (Open + new tab + peek), keeping the pencil-forcing that lets a linked body coexist with inline edit. `href` still overrides the route for an admin-side/satellite one. **Do not hand-roll a `<Link>` in a `cell`** — that is the Open-only door this replaced | `entityToken` on the column | `@ai-matrx/design-system/data-table/types` |
| The scoped list RPC behind a config's `service` | the `*_list_scoped` template | `lib/list-scope/FEATURE.md` |
| **One action list per entity**, consumed identically by table, cards, rows, and right-click | `ItemMenuConfig` + `ItemMenu` / `ItemContextMenu` | `@ai-matrx/design-system/item` |
| A list / sidebar / tree row with kebab + right-click + inline rename | `ItemRow` | `@ai-matrx/design-system/item` |
| Rename in place (optimistic or awaited) | `EditableLabel` | `@ai-matrx/design-system` (npm) |
| Persist a list's VIEW STYLE (view, density, sort, page size, hidden columns — never search/filters/page) | `useListViewPrefs` | `lib/list-views/useListViewPrefs.ts` — see `lib/list-views/FEATURE.md` |
| Every action an **agent** record supports (23 entries) | `buildAgentMenu` + `useAgentRowActions` | `features/agents/browse/agentActionRegistry.tsx`, `features/agents/browse/useAgentRowActions.tsx` |
| The same for a **note** / **conversation** / **pdf doc** | `buildNoteMenu` · `conversationActionRegistry` · `buildPdfDocMenu` | `features/notes/components/note-actions/noteMenuRegistry.tsx` · `../aidream/apps/shared/chat/src/agents/components/conversation-actions/conversationActionRegistry.tsx` · `features/pdf-extractor/studio/pdfDocMenu.tsx` |
| **Universal right-click menu** (copy-as, export, download as markdown, convert, attach, share, AI actions) | `NonEditableContextMenu` / `EditableContextMenu` — pass `contentSource` **and** `entity` or half the menu stays dark | `@ai-matrx/context-menu (src/engine/NonEditableContextMenu.tsx)`, `@ai-matrx/context-menu (src/engine/EditableContextMenu.tsx)` — see the `context-menu-v3` skill |
| Copy, prepare, or export content from a new surface without recreating a menu, serializer, or destination list | `ContentTransferMenu` / `AlchemyMenu` from the Alchemy public React entry — pass a payload or click-time source; inherit a mounted declared surface when no source is supplied | Usage demo: `app/(admin)/administration/ui/official-components/alchemy/page.tsx` |
| Copy + Copy-for-AI (+ Export) on any data surface | `CopyButtons` over the package-owned Alchemy Menu (`export` / `grouped`) | `components/agent-copy/CopyButtons.tsx` — see `components/agent-copy/README.md` |
| Building a KIND COMPONENT (Shape renderer, compiled or DB-authored): drag-to-reorder list, side-by-side panels grid, panel with overflow menu / subline / pinned footer, title+stats+copy header, streaming skeleton + tolerant reads, wrapping keyword chips | `SortableList` · `KindPanelGrid` · `KindPanel` · `KindHeaderBar` · `StreamingSkeleton` + `useStreamingValue`/`streamList`/`streamText` · `KeywordChip`/`TagList` | `@ai-matrx/content-ir/kind-kit (was components/kind-kit/)*`; all allowlisted for the in-page compiler; demo `/demos/kind-kit` |

### Components — AI assists & promises

| If you need to… | Use | Located at |
| --- | --- | --- |
| Offer a one-click AI action at a friction point (error, empty state, gap) — ask this BEFORE designing a manual affordance | `makeEphemeralAssist` + `AssistChip` (inline) · `emitAssistTracked` (durable, needs `dedupeKey` + `filterUndecidedKeys` first) | `features/assists/types.ts`, `features/assists/components/AssistChip.tsx`, `features/assists/redux/emitTracked.ts` — see `features/assists/FEATURE.md` |
| Run / dismiss an assist (never hand-roll an accept handler) | `useAssistRunner` | `features/assists/runtime/useAssistRunner.ts` |
| **Capture "was this AI output good?"** — a thumbs button, a "this is wrong" affordance, or the corrected-output pair when a user edits an AI output in-app. ONE destination, `platform.output_feedback`; a second feedback store is a defect | `useOutputFeedback` (+ `useHydrateOutputFeedback` for lists) | `lib/output-feedback/useOutputFeedback.ts` — see `lib/output-feedback/FEATURE.md` |
| Advertise a not-yet-built action (never a bare "coming soon" string) | `announceComingSoon(id)` + register the id | `lib/coming-soon/announce.ts`, `lib/coming-soon/registry.ts` |
| **Walk a user through a multi-step setup** — anything with prerequisites, a connection to prove, a value to paste somewhere else. DECLARE the steps; never hand-build a wizard, a gate block, or a readiness panel. Every step is exactly one of three kinds: **auto** (we do it for them, unasked), **verified** (they do it, we machine-check it live and show the reason AND the one-click fix — never a checkbox for something we can check), **confirmed** (genuinely un-checkable: exact copy-paste values + a how-to + a tick). Persists per org, survives days away, and **re-verifies on return** because a step that passed can regress (a DNS record gets deleted). "We couldn't check" is its own neutral state, never a failure, and never triggers an auto action | `GuidedChecklist` + `registerChecklist` | `lib/guided-setup/components/GuidedChecklist.tsx`, `lib/guided-setup/registry.ts` — see `lib/guided-setup/FEATURE.md`; consumer `features/marketing/search-console/setup/siteSetupChecklist.tsx` |

### Components — markdown & content

| If you need to… | Use | Located at |
| --- | --- | --- |
| Render streaming or static markdown | `MarkdownStream` | `@ai-matrx/chat/ui/markdown-stream/MarkdownStream` |
| Lightweight non-streaming markdown | `BasicMarkdownContent` | `@ai-matrx/rich-content/display/chat-markdown/BasicMarkdownContent` |
| Document shell with actions + context menu | `RichDocument` | `@ai-matrx/rich-content/rich-document/RichDocument` |
| Floating content action rail (copy, TTS, export…) | `RichDocumentActions` (the one action bar) | `@ai-matrx/rich-content/rich-document/RichDocumentActions` |
| Compare structured records, optionally with exact version / per-field dates | `DiffViewerShell` + `DiffTemporalMetadata` | `@ai-matrx/diff/react`, `@ai-matrx/diff` |
| **Render ANY JSON value as a human document** (the floor beneath the Shape System — never a `JSON.stringify` fence) | `StructuredValueView` | `components/official/structured-value/StructuredValueView.tsx` |
| Inspect / edit large JSON | `JsonInspector` | `components/official-candidate/json-inspector/JsonInspector.tsx` |
| Detect JSON in text (fenced or bare) / re-print it minified, condensed, or pretty | `detectJson` / `formatJsonText` | `@ai-matrx/kit/json-format` |
| Clean up a document (whitespace, typography, JSON blocks) without harming code | `cleanContent` | `lib/content-cleanup/clean.ts` |

### Components — chat & messages

| If you need to… | Use | Located at |
| --- | --- | --- |
| Full agent conversation column | `AgentConversationColumn` | `../aidream/apps/shared/chat/src/agents/components/shared/AgentConversationColumn.tsx` |
| Assistant message turn | `AgentAssistantMessage` | `../aidream/apps/shared/chat/src/agents/components/messages-display/assistant/AgentAssistantMessage.tsx` |
| User message turn | `AgentUserMessage` | `../aidream/apps/shared/chat/src/agents/components/messages-display/user/AgentUserMessage.tsx` |
| Per-message ⋮ actions | `MessageOptionsMenu` (+ registry) | `../aidream/apps/shared/chat/src/agents/components/messages-display/message-options/` |
| TTS play control on content | `SpeakerButton` / `SpeakerGroup` | `features/tts/components/SpeakerButton.tsx` |

### Components — overlays, windows, dialogs

| If you need to… | Use | Located at |
| --- | --- | --- |
| Draggable / resizable window frame | `WindowPanel` | `@ai-matrx/summon/window` — see `features/window-panels/FEATURE.md` |
| Open any overlay / window / modal | typed opener, else `openOverlay` | `features/overlays/definitions/*`, `@ai-matrx/summon/open` — see `features/overlays/FEATURE.md` |
| **Register a NEW window panel** (~10 registration sites; a half-registered panel is invisible to the tray, minimize-all and persistence). **Check first whether a twin already exists** — seven windows currently have a canonical opener with ZERO call sites while a colocated copy does the work, and several blocking modals already have a `WindowPanel` twin one file over | the `window-panel-authoring` skill (deleting one: its `removing.md`) | `.claude/skills/window-panel-authoring/SKILL.md` — see `features/window-panels/FEATURE.md` |
| Full-viewport overlay shell | `FullScreenOverlay` | `components/official/FullScreenOverlay.tsx` |
| Imperative confirm (replaces `window.confirm`) | `confirm({…})` | `components/dialogs/confirm/ConfirmDialogHost.tsx` |
| Inline destructive confirm | `ConfirmDialog` | `components/ui/confirm-dialog.tsx` |
| Single-string prompt (replaces `window.prompt`) | `TextInputDialog` | `@ai-matrx/design-system` |
| A control the viewer cannot use (not allowed) — hide it and offer "Ask for access": note + context → org admins (access-request ledger + DM) or, for system-owned things, the platform team (user feedback) | `RequestAccess` / `useRequestAccess` | `@ai-matrx/sharing/access/react` |

### Components — files, media, layout

| If you need to… | Use | Located at |
| --- | --- | --- |
| Upload / normalize / resolve any file | `fileHandler` | `features/files/handler/handler.ts` — see `features/files/handler/FEATURE.md` |
| Render owned media (self-healing URLs) | `InlineMediaRef` | `@ai-matrx/media/react` (host wiring: `features/files/media-client/`) |
| Compact interactive media attachment | `MediaAttachmentThumbnail` | `features/files/components/inline/MediaAttachmentThumbnail.tsx` |
| Selectable file thumbnail with preview + context menu | `SelectableFileThumbnail` | `features/files/components/preview/SelectableFileThumbnail.tsx` |
| Compact video publish date (MM/DD/YY or No Date) | `VideoPublishDate` | `features/files/blocks/video/VideoPublishDate.tsx` |
| `(core)` route header chrome | `PageHeader` | `features/shell/components/header/PageHeader.tsx` |
| Route-specific actions in the canonical `(public)` header | `PublicHeaderActionsPortal` | `components/matrx/PublicHeaderActionsPortal.tsx` |
| Resizable workbench side/bottom panel | `MatrxDynamicPanel` | `components/matrx/resizable/MatrxDynamicPanel.tsx` |
| Settings preference controls | settings primitives + `useSetting` | `components/official/settings/primitives/*`, `features/settings/hooks/useSetting.ts` |
| A label's one-sentence definition (info icon: hover, focus, tap) | `InfoHint` | `@ai-matrx/design-system/controls` (`InfoHint`) |
| KPI tile row (one number, label, hint, definition, drill-in) | `KpiTile` / `KpiGrid` | `components/official/kpi/KpiTile.tsx` |

### Utilities

| If you need to… | Use | Located at |
| --- | --- | --- |
| **Read a list you will treat as COMPLETE** — an existence check, a diff, a set subtraction, a `.length` comparison, anything deciding "if it isn't in this list it doesn't exist". PostgREST silently caps a plain `.select()` at 1000 rows and reports the cut only in a `Content-Range` header, so the list just gets shorter and the verdict gets wrong (D190: a 1005-row ledger read as 1000 reported 5 freshly-applied migrations UNAPPLIED and blocked releases; `ui.ui_surface_value` is 4185 rows and fed a DELETE). This pages to a verified total and THROWS rather than return a confidently-wrong partial. **Never hand-roll another paging loop.** A bare `.select()` is fine only when a short list is an acceptable answer — rendering, preview, sampling | `readAllRows` / `tryReadAllRows` (supabase-js), `readAllRowsRest` / `tryReadAllRowsRest` (raw REST) | `@ai-matrx/data/db` |
| **Write ONE record** (`.update()` / `.delete()` filtered by `.eq("id", …)`) and know it landed. PostgREST answers a write that RLS refused, or that hit a row already gone, with status 200, zero rows and NO error — judging success by `error == null` shows "Card deleted" over nothing (flashcards, 2026-09-25). End the chain in `.select("id")` and pass it through this: it returns the written row, passes a DB error through as is, and turns zero rows into a plain-English `WriteDidNotLandError`. Guard: `pnpm check:single-record-writes` (per-file ratchet) | `writeOne` (throws) / `tryWriteOne` (`{ row, error }`) | `utils/supabase/writeOne.ts` |
| Keep a composer/input DRAFT alive through reloads, crashes, and failed sends — user-authored text is cleared ONLY after it durably landed somewhere visible; never hold a draft in bare `useState` | `useDurableDraft` | `@ai-matrx/kit/drafts` |
| Keep a MULTI-STEP FORM's answers alive for as long as its step (a step in the URL survives a reload; React state does not, and the draft cache is read back asynchronously — a later step drawn from an unread cache is a confident lie, W43) | `useWizardDraft` + `resolveWizardStep` + `<WizardAnswersLost>` | `lib/wizard-draft/` |
| Know whether persisted Redux state has finished loading ("nothing saved" vs "not read yet") | `useSyncHydrated` | `lib/sync/useSyncHydrated.ts` |
| Stop a superseded async response from applying (refetch on a changing scope/query/id) | `useLatestRequest` | `@ai-matrx/kit/latest-request` |
| Run independent bulk work without serial waits or an unbounded request spike | `runWithConcurrency` | `@ai-matrx/kit/concurrency` |
| Say a read FAILED rather than render its rows as fresh | `StaleDataNotice` | `@ai-matrx/design-system` |
| Render a count derived from a read that may have failed | `UntrustedCount` | `@ai-matrx/design-system` |
| Invalidate a heavy chunk's cache from a ubiquitous module with NO import edge (D115) | `registerInvalidationCallback` / `fireInvalidation` | `@ai-matrx/kit/invalidation` |
| Humanize labels (snake/kebab → Title Case, acronyms) | `formatText` / `formatTitleCase` | `@ai-matrx/kit/text-case` |
| Slugify to kebab-case | `convertToKebabCase` | `utils/text/stringUtils.ts` |
| Markdown → speakable plain text (TTS) | `parseMarkdownToText` | `@ai-matrx/media/voices` |
| Strip markdown to plain text | `cleanMarkdown` | `utils/markdown-processors/clean-markdown-to-text.ts` |
| Drop a portion's (slide / page / sheet) leading heading when your own chrome already shows it | `stripDuplicatePortionHeading` | `lib/markdown/portion-heading.ts` |
| Copy / strip / sanitize markdown for clipboard | markdown-copy helpers | `@ai-matrx/rich-content/copy/copy-commands` |
| Detect expiring S3 signed URLs | `isSignedUrl` | `lib/media/signed-url.ts` |
| Categorize an image by size tier / photo grade / aspect (photo vs graphic vs icon, dimension inference from URL) | `categorizeSizeTier`, `photoGrade`, `categorizeAspect`, `resolveDimensions` | `lib/media/categorization.ts` |
| Alarm on non-durable media URLs | `reportMediaDurabilityViolation` | `lib/media/durability.ts` |
| Build a rounded SVG path through explicit collision-free map lanes | `roundedOrthogonalPath` | `features/canvas/edges/rounded-orthogonal-path.ts` |
| Cmd/Ctrl/middle-click → new tab | `shouldOpenInNewTab` / `openInNewTab` | `utils/navigation/should-open-in-new-tab.ts` |
| Toast success / error / info | `toast` from `sonner` | (package) — never `window.alert` |
| Undo after archive / move / remove (teach → guide → plain, ⌘Z, "Open Trash") | `announceReversible` | `lib/reversible/announceReversible.tsx` — never a hand-written `{ action: { label: "Undo" } }` (`pnpm check:undo-toasts`); `../common-docs/systems/platform/reversible-action/FEATURE.md` |
| Read a persisted `token_usage` JSONB blob (tokens, cache, cost, per-model) | `normalizeTokenUsage` / `rollupByModel` | `lib/token-usage/normalize.ts` |
| Convert a USD cost to points / format it (rate = the `billing.points_per_usd` knob via `currentPointsRate()` / `useCostDisplay().rate`) | `usdToPoints` / `formatCost` / `formatPoints` | `@ai-matrx/kit/format` + `components/cost/pointsRate.ts` |

### Hooks

| If you need to… | Use | Located at |
| --- | --- | --- |
| Detect mobile (Drawer vs Dialog, stack vs tabs) | `useIsMobile` | `@ai-matrx/kit/media-query` |
| Call Python backend from client (typed auth + URL + capture) | a generated `@ai-matrx/api/<domain>` operation called with `serverApi`; Redux/streaming surfaces use `callApi` | `lib/api/server-api.ts`; `lib/api/call-api.ts` |
| Auth headers for Next.js `/api/*` routes | `useApiAuth` | `hooks/useApiAuth.ts` |
| Resolve durable media `src` from `file_id` | `useMediaResolution(ref).resolution?.src` | `@ai-matrx/media/core` |
| Read / write a catalog preference | `useSetting` | `features/settings/hooks/useSetting.ts` |
| Show a cost — FIRST the deciding-vs-doing test: points only where the person is deciding or investigating (battle, picker, info/details, history table, bulk/repeating confirm, schedule setup, billing, admin), never where they are doing (chat, results, receipts, toasts, buttons); then points for everyone, $ only for a system admin who flipped the switch | `<Cost usd>` / `<CostBadge>` (confirm step or picker only) / `useCostDisplay` | `components/cost/`; rule `../common-docs/policies/points-and-money-in-the-ui.md` (guard `pnpm check:cost-display`, P1 ALLOWED_PLACES) |
| Copy one complete agent request draft to another run | `copyInstanceRequestDraft` | `../aidream/apps/shared/chat/src/agents/redux/execution-system/thunks/copy-instance-request-draft.thunk.ts` |
| Prove a scroll area is not clipped (unbounded-height chain) | `useClippedContentGuard` | `lib/layout/useClippedContentGuard.ts` |
| Put a view control in the URL with refresh + Back/Forward fidelity | `useUrlState` + typed codecs | `@ai-matrx/kit/url-state` |
| Keep an always-open page current without reloading a hidden tab or interrupting typing | `useVisibilityAwarePageRefresh` | `features/launchpad/hooks/useVisibilityAwarePageRefresh.ts` |
| Give a local `MatrxDataTable` isolated shareable URL state | `MatrxDataTable urlState={{ id }}` | `@ai-matrx/design-system/data-table` |
| Control a remote `MatrxDataTable` from isolated URL query state | `useTableUrlState({ tableId })` | `@ai-matrx/design-system/data-table/url-state` |

### Systems (extend these — never fork)

| System | Entry | Doc |
| --- | --- | --- |
| Overlay catalog + openers | `features/overlays/` | `features/overlays/FEATURE.md` + `overlay-system` skill |
| Window panels + tray | `features/window-panels/` | `features/window-panels/FEATURE.md` + `window-panels` skill |
| Universal files | `features/files/handler/` | `features/files/handler/FEATURE.md` |
| Actions on content (every bar, ⋯, right-click, sheet, palette) | the ONE Alchemy action registry — register via `@ai-matrx/rich-content/rich-document/actions/provider` (`registerAction`) or a provider | register an action; never build a parallel menu or registry (ALC-15) |
| Parameterized message authoring + strict real-record rendering | `agent.message_template`, `features/message-templates/`, aidream `../aidream/aidream/services/message_templates` | `features/message-templates/FEATURE.md` + common-docs `../common-docs/systems/communications/message-templates/FEATURE.md` |
| One human-reviewed Lane B email | planned `crm.interaction` + aidream `../aidream/aidream/services/outreach_single_send` | `features/crm/components/outreach-lists/SingleSendDialog.tsx` + aidream `../aidream/aidream/services/outreach_single_send/FEATURE.md` |
| Canonical entity list shell | `lib/entity-list/` | `lib/entity-list/FEATURE.md` — write a config, never a bespoke table |
| Scoped configuration (platform → org → user setting/limit/mode) | `platform.feature_knob` + `platform.knob_override`, client `lib/scoped-config/` | `../common-docs/systems/platform/feature-knobs/FEATURE.md` — a knob row, never a `*_config` table or settings blob |
| Per-entity record actions | `@ai-matrx/design-system/item` | one `ItemMenuConfig` builder per entity; three rival lists for one entity is the defect this kills |
| Universal right-click | `@ai-matrx/context-menu` | `features/context-menu-host/FEATURE.md` + `context-menu-v3` skill |
| AI assists everywhere | `features/assists/` | `features/assists/FEATURE.md` — never fork a second chip, table, or accept handler |
| Signed Twilio webhooks (Messaging, Voice, future channels) | `validateTwilioWebhook` | `lib/communications/providers/twilio/webhook-validation.ts` |
| Route metadata + branded social previews | `createRouteMetadata` / `createDynamicRouteMetadata` + shared social-card themes | `utils/route-metadata.ts`, `features/social-cards/FEATURE.md` |
| Entity token → route / icon / peek (THE DOOR LAW) | `features/scopes/registry/entityRegistry.ts` + `features/organizations/peek/` | add `hrefFor` / a peek to the REGISTRY, never to the call site |
| Scopes / context assignment | `features/scopes/` | `features/scopes/FEATURE.md` — Surface A vs B invariant |
| Settings catalog | `features/settings/` | `features/settings/FEATURE.md` + `settings-system` skill |
