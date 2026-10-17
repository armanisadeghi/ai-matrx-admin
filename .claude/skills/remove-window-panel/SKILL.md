---
name: remove-window-panel
description: "No-trace removal recipe for a window panel or overlay. Use when deleting, killing or retiring a window/overlay, or consolidating X into Y and deleting X ('kill this panel', 'remove the X window'). NOT for adding or opening an overlay (use overlay-system)."
---

# Remove a Window Panel (kill it completely)

Deleting a panel means removing it from **every** place its registration spreads, then proving zero residue. A panel that "looks deleted" but leaves a stale overlay id, a dangling opener, a tile or an index row is a half-kill. **No shims. No back-compat aliases. No forwarding opener. No commented-out block or `// removed X` tombstone. No dead panel name in a comment.**

Read the [`overlay-system`](../overlay-system/SKILL.md) skill first if you do not know how overlays are declared. Editing the WindowPanel primitive itself is the [`window-panels`](../window-panels/SKILL.md) skill, and that engine is the npm package `@ai-matrx/summon`, so never "remove" package behavior here.

## The keystone: pull the definition, let TypeScript hunt

Each definition augments `OverlayRegistry` (`declare module "@ai-matrx/summon"`), so `OverlayId` is a closed union built from the definition files themselves.

1. **Delete the registrations first** (rows 1-4 below). That removes the union member.
2. **Run `pnpm type-check`.** Every hard reference (an `openOverlay({ overlayId: "x" })`, a tile `overlayId`, a caller of the deleted `useOpenX`) fails to compile. The compiler hands you the list.
3. **Grep finds the soft references** the compiler cannot see (comments, docs, link tokens, baselines). Do both; neither alone is complete.

## The removal checklist

Parameterize on `<overlayId>` (camelCase, e.g. `agentContentSidebarWindow`), `<slug>` (the definition's `window.windowId`, kebab), `<Component>`, and the tile id / label / link key.

| # | Location | What to remove |
|---|---|---|
| 1 | `features/overlays/definitions/<overlayId>.overlay.ts(x)` | `git rm`. The opener and the `OverlayRegistry` augmentation go with it. **Do this first.** |
| 2 | `features/overlays/definitions/<overlayId>.render.tsx` and `<overlayId>.link.ts` (if present) | `git rm`. |
| 3 | `features/overlays/definitions/registry.ts` | The `d.<id>Overlay,` line in `APP_OVERLAYS`. |
| 4 | `pnpm gen:overlays` | Regenerates `overlay-definitions.gen.ts` and `overlay-meta-index.ts` (never hand-edit them; `OVERLAY_ID_INDEX` derives from the meta index). |
| 5 | `features/window-panels/windows/**/<Component>.tsx` | The window component, `git rm`. |
| 6 | `features/window-panels/tools-grid/toolsGridTiles.ts` | The tile. |
| 7 | `features/overlays/definitions/trayPreviews.ts` | Any `registerTrayPreview("<overlayId>", ...)` (and its component in `registry/tray-previews.tsx` if unused elsewhere). |
| 8 | `features/overlays/definitions/callbacks/<name>.ts` or `windows/<feature>/callbacks.ts` | Only for a callback-aware opener: delete its contract. |
| 9 | `features/window-panels/registry/window-address-baseline.json` | Any row naming `<overlayId>` (`unaddressedBaseline` / `addressless` / `sharedAddresses`). |
| 10 | `features/admin/**` (FeatureAdminMap), `FEATURE.md`, README, docs | Any map row, table row or prose naming the panel. |

Not every panel touches all ten: no link skips the `.link.ts`, no callbacks skips 8. Rows 1-5 are universal.

## Repoint every opener before you delete it

```bash
git grep -n "useOpen<Component>\|<Component>Controller\|definitions/<overlayId>"   # opener hook + declarative wrapper + imports
git grep -n 'overlayId: "<overlayId>"'                                              # raw dispatch sites and tiles
git grep -n "panels=<linkKey>"                                                      # ?panels= deep links in code and docs
```

Repoint each caller to the replacement **before** removing the dead one. The Tools grid tile is itself a usage: remove it (capability gone) or repoint its `overlayId` (capability moved). Confirm the replacement covers the dead panel's capability; parity is the user's call, never a silent drop.

## Do NOT delete shared infrastructure the panel happened to touch

Before removing anything the dead component imported, owned or was marked with, prove it is unused elsewhere:

- **The `window.deprecated` mechanism** (red ring + banner, mirrored in the generated `overlay-meta-index.ts`) is shared by many windows. Remove the panel's block, never the package's rendering of it.
- **Shared icons** in `toolsGridTiles.ts`: the import stays if another tile uses it.
- **Shared exports the component re-exported** (`ALL_TABS`, `TabContent`, a panel such as `MediaDevicesPanel`): relocate the shared piece first.
- **Package behavior**: never delete or fork anything under `@ai-matrx/summon`; if the package is wrong, fix it in `../aidream/apps/shared/summon`.

## Clean comments, do not just delete

Reword a comment that names the dead panel to keep the useful doc without the name. The bar: not even a comment mentions it.

## Verify: the kill is not done until this passes

1. Re-grep every token, case-insensitive, across the repo (exclude `node_modules`, `.next*`). Must be empty:
   ```bash
   git grep -niE "<overlayId>|<Component>|<slug>|<label>|tile.<tile-id>|<linkKey>" -- '*.ts' '*.tsx' '*.md' '*.json'
   ```
2. Deleted files are gone and no import of the deleted opener or component path survives.
3. `pnpm type-check` clean for every touched file.
4. `npx jest features/overlays/definitions features/window-panels/__tests__` (`pnpm check:overlays` and the address census catch a missed step).
5. `pnpm check:doctrine` and `pnpm check:surface-overlays` pass.
6. Spawn an independent `Explore` subagent to re-verify from scratch with this checklist and the token list.
7. Inspect `git status` and commit **only** the panel's files; stage your paths explicitly if unrelated files are dirty.

## Worked example

The kill of **Agent Editor (Sidebar)** (`agentContentSidebarWindow`, replaced by `agentAdvancedEditorWindow`) was small and total: definition + render + registrations, the window component, the tile, zero external openers, the `deprecated` mechanism and the shared `FileStack` icon kept. That is the canonical shape.
