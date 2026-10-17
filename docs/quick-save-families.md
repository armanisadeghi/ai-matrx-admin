# Quick Save Families

Cross-feature pattern for **capture content → edit/reconcile → save to a destination** (create new or append/update existing).

Not about browsing workspaces (`QuickDataWindow`, `QuickTasksWindow`, `QuickNotesSheet` — those are list/edit shells, not capture-save flows).

---

## Standard pattern

| Layer | Responsibility | Typical files |
|-------|----------------|---------------|
| **Hook** | Form state, transforms, create vs update, persist | `useQuick*Save.ts`, `use*QuickCreate.ts` |
| **Core** | Presentational UI — editor, picker, save controls, post-save actions | `*Core.tsx` |
| **Shell** | Chrome only — overlay, dialog, drawer, window, popover | `*Overlay.tsx`, `*Dialog.tsx`, `*Window.tsx` |
| **Opener** | `openOverlay({ overlayId, data })` + typed hook | `features/overlays/definitions/*.tsx` |
| **Trigger** | Button, menu item, bridge | the one action registry (`RichDocumentActions` / right-click / ⋯), `*Button.tsx` |

**Shared post-save primitive (reuse, not a family):** [`OpenDestinationDialog`](../features/page-extraction/data-review/OpenDestinationDialog.tsx) — Here / new tab / window after create.

**Platform rule:** build a reusable family (Core + Hook + Shell), not a one-off modal. See [PRINCIPLES.md](../PRINCIPLES.md) — *Build the Platform, Not the Artifact*.

---

## Developer resources (read these first)

Curated guides that already exist. Prefer **skills** for step-by-step; use **FEATURE.md** for deep reference.

### Primary — adding a new family

| Resource | Path | Use when |
|----------|------|----------|
| **Overlay system skill** | [`.claude/skills/overlay-system/SKILL.md`](../.claude/skills/overlay-system/SKILL.md) | Register overlay ID, write opener, wire `OverlayWorldHost`, debug render. **Start here.** |
| **RichDocument actions skill** | [`.claude/skills/rich-document-actions/SKILL.md`](../.claude/skills/rich-document-actions/SKILL.md) | Add a “Save to X” menu action via `registerAction` + `openOverlay` (or stage Redux bridge like tasks). |
| **Overlays FEATURE** | [`features/overlays/FEATURE.md`](../features/overlays/FEATURE.md) | Deep reference for overlay slice, catalogue, callback groups. |
| **The one action registry** (ALC-15; `ContentActionBar` and `contentActionRegistry` were deleted) | `@ai-matrx/chat` `agents/components/messages-display/rich-document/actions/` (`register-w2a.ts`, `register-w3c.ts`, `register-w3d.ts`, `bodies/`); web entry `ensureWebRichDocumentRegistrations` in [`rich-document-registrations.ts`](../features/rich-content-host/rich-document-registrations.ts) | Copy an existing descriptor + body (`save-to-notes`, `save-to-code`, `save-to-task`) in the package; every host inherits it. |
| **Code-splitting skill** | [`.claude/skills/code-splitting/SKILL.md`](../.claude/skills/code-splitting/SKILL.md) | Lazy-load Core/Shell in `OverlayWorldHost` via `lazyOverlay` — never stack `dynamic()` boundaries. |

### Domain-specific (partial families today)

| Resource | Path | Use when |
|----------|------|----------|
| **Data tables FEATURE** | [`features/data-tables/FEATURE.md`](../features/data-tables/FEATURE.md) | UDT table save engine: `reconcile.ts`, `save-to-table.ts`, existing `SaveTableModal` / `AppendToTableDialog`. |
| **RichDocument save actions** | `@ai-matrx/chat` `register-w2a.ts` / `register-w3c.ts` / `register-w3d.ts` + `bodies/` | How scratch / notes / code / task saves are orchestrated today. |

### Reference implementations (copy structure)

| Family | Best file to copy |
|--------|-------------------|
| Notes | [`QuickNoteSaveCore.tsx`](../features/notes/actions/quick-save/QuickNoteSaveCore.tsx) + [`saveToNotes.tsx`](../features/overlays/definitions/saveToNotes.overlay.tsx) |
| Code | `@ai-matrx/chat/window-panels/windows/code/SaveToCodeWindow` (package body over the `host/code-files` slots, registered in `providers/chatMessageActionSlots.ts`) + [`saveToCode.tsx`](../features/overlays/definitions/saveToCode.overlay.tsx) |
| Tasks | [`TaskQuickCreateCore.tsx`](../features/tasks/widgets/quick-create/TaskQuickCreateCore.tsx) + [`CreateTaskFromSourceDialog.tsx`](../features/tasks/widgets/CreateTaskFromSourceDialog.tsx) (bridge pattern) |

### Minimal checklist — new family

1. **Hook + Core** — UI-agnostic save logic; shell does not own form state.
2. **Shell** — Dialog/Drawer (mobile) or `WindowPanel` or `FullScreenOverlay`; all render the same Core.
3. **Register** — `catalogue.ts` entry (its key is the `OverlayId`) → component + opener → gated block in `OverlayWorldHost.tsx`.
4. **Trigger** — `registerAction` in the rich-document handlers (the one action registry; every bar, ⋯, right-click and palette shows it).
5. **Post-save** — reuse [`OpenDestinationDialog`](../features/page-extraction/data-review/OpenDestinationDialog.tsx) where navigation choice matters.

### Stale or narrow — use with caution

| Resource | Path | Note |
|----------|------|------|
| Message actions overlay skill | [`.claude/skills/message-actions-overlay-system/SKILL.md`](../.claude/skills/message-actions-overlay-system/SKILL.md) | Architecture diagram still useful; **`openSaveToNotes` and old controller paths are outdated** — use `openOverlay({ overlayId: "saveToNotes" })` or typed openers. |
| Notes actions skill | [`.claude/skills/notes-actions/SKILL.md`](../.claude/skills/notes-actions/SKILL.md) | Notes-only; same stale `openSaveToNotes` reference. |
| Window panel authoring skill | [`.claude/skills/window-panel-authoring/SKILL.md`](../.claude/skills/window-panel-authoring/SKILL.md) | **`WindowPanel` layout patterns OK**; registry-driven rendering steps are legacy — overlay wiring is in **overlay-system** skill. |
| Overlay overhaul doc | [`docs/archive/2026/features/overlays/FEATURE.md`](./archive/2026/features/overlays/FEATURE.md) | Historical *why* (silent-render bug class); not a how-to for new work. |

---

## Canonical families (full Core + Hook + Shell)

### 1. Notes

| Piece | Path |
|-------|------|
| Hook | [`useQuickNoteSave.ts`](../features/notes/actions/quick-save/useQuickNoteSave.ts) |
| Core | [`QuickNoteSaveCore.tsx`](../features/notes/actions/quick-save/QuickNoteSaveCore.tsx) |
| Shells | [`QuickNoteSaveOverlay.tsx`](../features/notes/actions/quick-save/QuickNoteSaveOverlay.tsx) (prod), [`QuickNoteSaveWindow.tsx`](../features/window-panels/windows/notes/QuickNoteSaveWindow.tsx), [`QuickNoteSaveDialog.tsx`](../features/notes/actions/quick-save/QuickNoteSaveDialog.tsx), [`QuickNoteSavePopover.tsx`](../features/notes/actions/quick-save/QuickNoteSavePopover.tsx) |
| Overlay IDs | `saveToNotes`, `saveToNotesFullscreen`, `quickNoteSaveWindow` |
| Opener | [`saveToNotes.tsx`](../features/overlays/definitions/saveToNotes.overlay.tsx) |
| **Usage example** | `register-w2a.ts` → `save-to-notes` (body in `bodies/w2a-actions.ts`; opens the quick-note-save window) |

### 2. Code

| Piece | Path |
|-------|------|
| Body | `@ai-matrx/chat/window-panels/windows/code/SaveToCodeWindow` (the package; every host opens the same window) |
| Host services | `@ai-matrx/chat/host/code-files` slots, this app's in [`chatMessageActionSlots.ts`](../providers/chatMessageActionSlots.ts) |
| Overlay ID | `saveToCode` |
| Opener | [`saveToCode.tsx`](../features/overlays/definitions/saveToCode.overlay.tsx) |
| Trigger | [`SaveToCodeButton.tsx`](../features/code-files/actions/SaveToCodeButton.tsx) |
| **Usage example** | `register-w3c.ts` → `save-to-code` (body in `bodies/w3c-actions.ts`) |

### 3. Tasks

| Piece | Path |
|-------|------|
| Core | [`TaskQuickCreateCore.tsx`](../features/tasks/widgets/quick-create/TaskQuickCreateCore.tsx) |
| Panel | [`TaskCreatePanel.tsx`](../features/tasks/widgets/quick-create/TaskCreatePanel.tsx) |
| Shell | [`TaskQuickCreateWindow.tsx`](../features/window-panels/windows/tasks/TaskQuickCreateWindow.tsx) |
| Bridge | [`CreateTaskFromSourceDialog.tsx`](../features/tasks/widgets/CreateTaskFromSourceDialog.tsx) (stages `setPendingSource` → opens window) |
| Overlay ID | `taskQuickCreateWindow` |
| Opener | [`taskQuickCreateWindow.tsx`](../features/overlays/definitions/taskQuickCreateWindow.overlay.tsx) |
| **Usage example** | `register-w3d.ts` → `save-to-task` (body in `bodies/w3d-actions.ts`) |

---

## Partial / fragmented (same intent, not unified yet)

| Domain | What exists today | Key paths |
|--------|-------------------|-----------|
| **UDT Tables** | Save engine + bespoke dialogs; no shared Core/Hook | [`save-to-table.ts`](../features/data-tables/save-to-table.ts), [`SaveTableModal.tsx`](../components/mardown-display/tables/SaveTableModal.tsx), [`AppendToTableDialog.tsx`](../components/mardown-display/blocks/json/AppendToTableDialog.tsx) |
| **Workbooks** | One-shot push button + destination chooser | [`SendToWorkbookButton.tsx`](../components/mardown-display/tables/SendToWorkbookButton.tsx), [`workbook-service.ts`](../features/workbooks/workbook-service.ts) |
| **Documents** | Full editor routes; no capture-save overlay | [`DocumentEditor.tsx`](../features/documents/components/DocumentEditor.tsx), [`document-service.ts`](../features/documents/document-service.ts) |
| **Structured Lists** | Manager windows + server actions; no content capture flow. Canonical tables are `udt_structured_lists` / `udt_structured_list_items`. | [`PicklistManagerV2Window.tsx`](../features/window-panels/windows/PicklistManagerV2Window.tsx), [`list-actions.ts`](../features/data-tables/pick-lists/actions/list-actions.ts) |
| **Projects** | Peek + task project picker only; no quick-save family | [`ProjectPeek.tsx`](../features/organizations/peek/kinds/ProjectPeek.tsx) |
| **Agent shortcuts** | Hook + window; create-in-place, not content capture | [`useShortcutQuickCreate.ts`](../features/agent-shortcuts/hooks/useShortcutQuickCreate.ts), [`AgentShortcutQuickCreateWindow.tsx`](../features/window-panels/windows/agents/AgentShortcutQuickCreateWindow.tsx) |

**One-click shortcuts (no modal):** Notes [`SaveToScratchButton`](../features/notes/actions/SaveToScratchButton.tsx), Code scratch in `register-w3d.ts` → `save-code-to-scratch`.

**Generic save orchestration:** the package's `register-w2a.ts` / `register-w3c.ts` / `register-w3d.ts` descriptors dispatch to the notes/code/task scratch flows through host seams (UI slots) the web wires.

---

## Confirmed — add these families

- [ ] **UDT Data Table** — `QuickSaveTableCore` + append/replace/create column reconcile (lift from `SaveTableModal` / `save-to-table.ts`)
- [ ] **Structured List** — capture rows/items → create list or append to existing; can later be consumed as dropdown/picklist choices
- [ ] **Document** — capture markdown/text → create doc or append section
- [ ] **Workbook** — capture tabular data → new sheet or target workbook (unify `SendToWorkbookButton`)
- [ ] **Project** — capture content → create project or attach to existing (title, description, scope)

---

## Could add (not confirmed)

- [ ] **Transcript** — save segment / full transcript to library
- [ ] **Artifact / Canvas** — capture block or canvas state to artifact store
- [ ] **Research document** — save synthesis / source bundle to research pipeline
- [ ] **PDF derivative** — save extraction/redaction result as new PDF doc
- [ ] **Generic file** — extend `save-as-file` (descriptor in the package's `descriptors/export.ts`) to full Core+Hook (name, folder, format)
- [ ] **Scope / context item** — capture value into a scope dimension
- [ ] **Dictionary term** — quick-add term + pronunciation from selection
- [ ] **Podcast episode** — capture script/notes into episode draft
- [ ] **Workflow** — stage content as workflow input / node payload
- [ ] **Image / media** — save generated or pasted media via file handler
- [ ] **Email draft** — capture content into compose overlay
- [ ] **Feedback** — quick-file bug/feature from selection (partial: [`FeedbackWindow`](../features/window-panels/windows/FeedbackWindow.tsx))
