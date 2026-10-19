# Message templates — frontend implementation

Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/systems/communications/message-templates/FEATURE.md — read it before touching this feature in ANY repo.

## Rules tied to code in this directory

- Row and write types derive from `types/database.types.ts`; only the `metadata` JSON field is narrowed, with `readMessageTemplateMetadata()` (`types/message-templates-db.ts`). Never hand-mirror the row.
- The quick-save window (`quick-save/`) reuses `RefinableContentEditor`, the canonical template service, `WindowPanel`, `lazyOverlay` and the registered `message_template` `EntityRef` door. No new table or parallel writer.
- The Smart Agent Input picker reuses the canonical template service, `ProInput`, `ResourcePickerSubViewHeader`, `EntityDoorControls` and the canonical user-input slice; the full `TemplateBrowserModal` stays dedicated to its preview-before-use authoring flow.
- Archive goes through `archiveTemplate` (`services/message-templates-service.ts`, sets `deleted_at`); every service list/org/tags/by-id read, `/chat/message-templates/[id]`, `/edit/[id]` and `/new?from=` hides archived rows. Never add a hard delete.
- `lib/merge-fields.ts` mirrors the server renderer's grammar and the senders' bindings; change them together. Never reuse the permissive AI variable replacer here.
- Name / Subject / Message are `MergeFieldTextarea` (`components/merge-field-input/` at the repo root), which owns its right-click menu and the field toolbar (`FormatButtons` through `formatTargetWithin`); `{{field}}` chips survive every format action. Guard: `components/rich-editor/__tests__/format-hosts.census.test.ts`.
- Unsaved edits use the shared `lib/navigation/useUnsavedChangesGuard`; View/Edit switches with `EntityModeHeader onModeSelect`.
- The record menu's page actions (Save / Discard / Edit / Show example / Archive) state `renderSlot: "overflow"` as a decision (`pnpm check:hidden-primary-actions`, rule `rich-action-no-slot`).
- The record page's own agent surface is `matrx-user/message-template` (`lib/message-template-scope.ts`: record XML bundle + `template_draft` draft target).
- `fetchMessageTemplates()` with no `publishedToWeb` is the caller's own list (`created_by`) on user pages and EVERY template on `/administration/utilities/message-templates`. Guard: `__tests__/admin-seat-lists-every-template.test.ts`.
