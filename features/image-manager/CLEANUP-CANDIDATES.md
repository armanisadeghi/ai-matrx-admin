# Image Manager — Cleanup Candidates (sign-off required)

**Status**: drafted by the Image Manager Hub plan, awaiting Arman's approval. Nothing in this list has been deleted yet. Review each item, confirm there's no surprise consumer you remember, then either approve a batch (e.g. "delete all green-flagged items") or comment on individual ones.

The plan's principle: every absorbed feature already has a home in the new hub. Items below are leftovers — broken-under-Turbopack legacy, demo pages superseded by the new route, or unused types — that no longer have callers in the live tree.

## Verification methodology

- `Grep` across the repo for both file paths and exported symbols.
- "Caller" = a real `import` from outside the module's own tree. Self-imports inside a tree don't count.
- Items marked **🟢 SAFE** have **zero** external callers; deletion is a tree drop.
- Items marked **🟡 NEEDS REFACTOR** are still imported but only by other code that's also slated for removal, or by trivial seams (a single re-export, a discriminated-union member). Each item explains the small change needed alongside deletion.
- Items marked **🔴 BLOCKER** still have legitimate callers and would need real refactor work. The plan does **not** propose deleting these.

## 1. `components/advanced-image-editor/` ✅ DELETED (2026-05-05)

Entire tree. Fabric.js-based image editor that was broken under Turbopack since the migration. Internal imports only — no consumer outside the directory. Dropped together with `vendors/fabric.js` and `app/vendor/fabric.js` in the fabric.js purge (item 9).

## 2-5. `app/(authenticated)/image-editing/**` ✅ DELETED (2026-05-05)

The entire `image-editing/` route folder was dropped — all four pages (`page.tsx`, `gallery/page.tsx`, `public-image-search/{page,layout}.tsx`, `simple-crop/page.tsx`) plus the directory itself.

User decision: deleted as a single batch after confirming each page was either a placeholder or a legacy demo with no live consumers. Type-check confirmed nothing else in the tree referenced these routes.

**Knock-on effects still pending owner sign-off:**

- `components/matrx/parallax-scroll/` is now orphaned (item 6) — its only consumer was `image-editing/gallery`.
- Live menu/nav entries still link to `/image-editing/public-image-search` — they will 404 until cleaned:
  - `constants/navigation-links.tsx` (the "Image Search" entry, surfaced by `<MatrxFloatingMenu>` and `<NavigationMenu>` on every authenticated route).
  - `constants/favicon-route-data.ts` (the "Im" favicon entry).
  - `components/layout/MatrixFloatingMenu.tsx` (deprecated component, console-warns on render — no live mount, but still has a hard-coded link to the dead route).
- `features/image-manager/components/ToolsTab.tsx` **Beta** group still renders four cards pointing to the deleted routes — owner explicitly requested it be left in place for now.

## 6. `components/matrx/parallax-scroll/` 🟢 SAFE (after #3)

Sole external caller is item 3 (`image-editing/gallery/page.tsx`). Once that page is deleted, this directory has no consumers.

**Recommendation**: delete the directory in the same change as item 3.

## 7. `components/matrx/camera/` 🔴 BLOCKER

Still imported by:

- `app/(authenticated)/tests/camera-test/page.tsx`
- `app/(authenticated)/tests/windows/page.tsx`

Both are admin/test pages, but they're real callers. **Do not delete** in this round. Either:

- Keep both `camera-test` and `camera/` as live test fixtures, or
- Delete the test pages first if you confirm they're abandoned, then delete `camera/` afterwards.

**Recommendation**: leave for now; revisit once the camera test pages are re-evaluated.

## 8. `types/imageEditorTypes.ts` 🟡 NEEDS REFACTOR

Imported by:

- `types/index.ts` — barrel re-export only.
- `lib/redux/dynamic/moduleSchema.ts` — included as a member of the `ModuleSchema` discriminated union (`AiAudioSchema | AiChatSchema | ImageEditorSchema | SystemComponentsSchema`).

Both consumers are easy to fix:

1. Drop the re-export line in `types/index.ts`.
2. Remove `ImageEditorSchema` from the `ModuleSchema` union and its corresponding key in `moduleSchemas`. The Image Editor module is dead, so no records ever populate this schema slot.

**Recommendation**: delete `types/imageEditorTypes.ts` together with the two-line refactor above.

## 9. `vendors/fabric.js` + `app/vendor/fabric.js` ✅ DELETED (2026-05-05)

Vendored fabric.js. Two copies existed (`vendors/fabric.js` ~1.0 MB and an orphaned duplicate at `app/vendor/fabric.js` ~1.2 MB). Both removed alongside `components/advanced-image-editor/` (item 1). The empty `vendors/` and `app/vendor/` directories were also removed.

Companion cleanups in the same change:

- `utils/next-config/webpackConfig.js` — dropped the `vendors/fabric.js` `script-loader` rule.
- `next.config.js` — removed the duplicate client-side `jsdom` externalization that was specifically scaffolded for fabric.js (the `webpackConfig.js` block already handles it for any other transitive consumer).
- `package.json` — removed `@types/fabric` from `devDependencies`; `pnpm install` re-pinned the lockfile.

## 10. `app/api/proxy-image/` ✅ ALREADY DELETED

Tracked here for completeness. The Image Manager Hub plan absorbed image-proxying via `app/api/image-proxy/route.ts`. The legacy `proxy-image` route had zero callers and was removed in Phase 4.2.

## Deferred follow-up — Markdown image block dedup

`components/mardown-display/blocks/images/ImageBlock.tsx` (363 lines) and `components/mardown-display/blocks/images/ImageOutputBlock.tsx` (117 lines) overlap on zoom/copy/share/feedback affordances. The Image Manager Hub plan called for consolidating them onto `ImageOutputBlock` as the base, with `ImageBlock` re-using the same primitives.

This is **deferred** out of the Hub plan — the hub work is independently complete, and the markdown renderer dedup is orthogonal (different file tree, different invocation path, different consumers). It's tracked here so we don't lose it.

When the time comes:

1. Audit `components/mardown-display/chat-markdown/block-registry/BlockComponentRegistry.tsx` for callers of both blocks.
2. Pick `ImageOutputBlock` as the canonical implementation.
3. Refactor `ImageBlock` to use the same primitives or absorb its remaining unique behavior into the consolidated block.
4. Drop the loser.

Owner: TBD. Trigger: next time someone touches markdown image rendering.

## What stays (intentionally)

- **`components/official/PublicImageSearch.tsx`** — has callers (admin demos, applets, gallery floating workspace). Refactored to use the server `/api/unsplash` route instead of being deleted. Phase 4.1.
- **`components/official/PasteImageHandler.tsx`** — building block used by multiple uppers; not in scope.
- **`features/canvas/social/preset-covers.ts`** — actively used by the Curated Covers chip in Public Images.

## Deletion checklist

Approved deletion order:

1. ✅ `app/api/proxy-image/` — done (Phase 4.2 of Hub plan).
2. ✅ `components/advanced-image-editor/` (item 1) — done 2026-05-05.
3. ✅ `vendors/fabric.js` + `app/vendor/fabric.js` (item 9) — done 2026-05-05. Companion build-config cleanup applied to `webpackConfig.js`, `next.config.js`, `package.json`.
4. ✅ `app/(authenticated)/image-editing/` (entire route folder, items 2 + 3 + 4 + 5) — done 2026-05-05.
5. ⏳ `components/matrx/parallax-scroll/` (item 6) — pending; orphaned now that item 4 has landed.
6. ⏳ `types/imageEditorTypes.ts` + the moduleSchema/types-index three-liner (item 8) — pending.
7. ⏳ Nav/menu/favicon refs (`MatrixFloatingMenu.tsx`, `constants/navigation-links.tsx`, `constants/favicon-route-data.ts`) — pending; live menu links now hit a 404 because item 4 landed without these. Owner explicitly opted to keep `ToolsTab.tsx` **Beta** subgroup in place for now (it links to the same dead routes but is gated behind the Tools tab).

After every step:

```bash
pnpm tsc --noEmit
```

If type-check passes after each batch, ship the deletion. If anything turns up, **stop** and either fix the consumer or restore the file.
