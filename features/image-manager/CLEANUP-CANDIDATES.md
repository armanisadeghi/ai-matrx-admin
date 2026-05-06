# Image Manager — Cleanup Candidates (sign-off required)

**Status**: drafted by the Image Manager Hub plan, awaiting Arman's approval. Nothing in this list has been deleted yet. Review each item, confirm there's no surprise consumer you remember, then either approve a batch (e.g. "delete all green-flagged items") or comment on individual ones.

The plan's principle: every absorbed feature already has a home in the new hub. Items below are leftovers — broken-under-Turbopack legacy, demo pages superseded by the new route, or unused types — that no longer have callers in the live tree.

## Verification methodology

- `Grep` across the repo for both file paths and exported symbols.
- "Caller" = a real `import` from outside the module's own tree. Self-imports inside a tree don't count.
- Items marked **🟢 SAFE** have **zero** external callers; deletion is a tree drop.
- Items marked **🟡 NEEDS REFACTOR** are still imported but only by other code that's also slated for removal, or by trivial seams (a single re-export, a discriminated-union member). Each item explains the small change needed alongside deletion.
- Items marked **🔴 BLOCKER** still have legitimate callers and would need real refactor work. The plan does **not** propose deleting these.

## 1. `components/advanced-image-editor/` 🟢 SAFE

Entire tree. Fabric.js-based image editor that's been broken under Turbopack since the migration. Internal imports only — no consumer outside the directory.

```bash
# Verification:
rg "from ['\"][^'\"]*advanced-image-editor" --type tsx --type ts -g '!components/advanced-image-editor/**'
# → no matches
```

**Recommendation**: drop the entire `components/advanced-image-editor/` directory.

## 2. `app/(authenticated)/image-editing/page.tsx` 🟢 SAFE

Disabled placeholder route — no UI affordance leads here, no internal links. Dead navigation entry only.

**Recommendation**: delete the page.

## 3. `app/(authenticated)/image-editing/gallery/page.tsx` 🟡 NEEDS REFACTOR

Legacy `ParallaxScroll` demo. Imports `ParallaxScrollAdvanced` from `components/matrx/parallax-scroll/ParalaxStoreAdvanced`.

**Coupled with**: `components/matrx/parallax-scroll/` (item 6). Delete both together.

## 4. `app/(authenticated)/image-editing/public-image-search/page.tsx` 🟢 SAFE

Standalone demo of the legacy `PublicImageSearch` modal. The route exists only as a demo target — `PublicImageSearch` itself stays (now refactored to use the server `/api/unsplash` route).

**Recommendation**: delete `page.tsx` + `layout.tsx` in this folder.

## 5. `app/(authenticated)/image-editing/simple-crop/page.tsx` 🟢 SAFE

`EasyImageCropper` demo. The Crop functionality is preserved as a tile in the new "Tools" group of the Image Manager. Demo route is redundant.

**Recommendation**: delete the page.

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

## 9. `vendors/fabric.js` 🟢 SAFE (after #1)

Vendored fabric.js. No imports outside `components/advanced-image-editor/`. Once item 1 is gone, this is orphaned.

**Recommendation**: delete the vendored copy in the same change as item 1.

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

## Deletion checklist (when approved)

If you approve the green-flagged items above, the safe deletion order is:

1. ✅ `app/api/proxy-image/` — already done.
2. `app/(authenticated)/image-editing/` (entire route folder, items 2 + 3 + 4 + 5).
3. `components/matrx/parallax-scroll/` (item 6 — only after step 2).
4. `components/advanced-image-editor/` (item 1).
5. `vendors/fabric.js` (item 9 — only after step 4).
6. `types/imageEditorTypes.ts` + the moduleSchema/types-index two-liner (item 8).

After every step:

```bash
pnpm tsc --noEmit
```

If type-check passes after each batch, ship the deletion. If anything turns up, **stop** and either fix the consumer or restore the file.

---

**Approval requested.** Comment on this file or reply with which items to drop. The plan defaults to "do nothing" until that approval lands.
