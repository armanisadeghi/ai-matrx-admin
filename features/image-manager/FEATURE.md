# FEATURE.md — `image-manager`

**Status:** `active`
**Tier:** `2`
**Last updated:** `2026-05-05`

---

## Purpose

`image-manager` is the canonical hub for every image-related affordance in the app — public stock search, the user's cloud library, branded variant uploads, the Image Studio surface, the Studio Library, profile-photo updates, AI generation (placeholder), and a Tools group hosting niche utilities (crop, lightbox, screenshot, etc.). Both the legacy modal `<ImageManager>` and the dedicated `/image-manager` route render off the same registry, so adding a tab is a one-line change.

---

## Entry points

**Routes**
- `app/(a)/image-manager/page.tsx` — full-page hub. Layout under `app/(a)/image-manager/layout.tsx`; client shell at `app/(a)/image-manager/_components/ImageManagerPageShell.tsx`.

**Modal**
- `<ImageManager>` from `components/image/ImageManager.tsx` — fullscreen overlay used by callers that need a picker. Consumes the same registry but filters out the secondary "Tools" group; never enters Browse mode.

**Hooks**
- `useBrowseAction()` from `features/image-manager/browse/BrowseImageProvider.tsx` — hook every Browse-aware tab calls. Wraps `openImageViewer()` from `features/window-panels/windows/image/ImageViewerWindow.tsx`.
- `useSelectedImages()` (re-used) from `components/image/context/SelectedImagesProvider.tsx` — adds Selection vs. Browse mode awareness via `selectionMode: "single" | "multiple" | "none"` (`"none"` semantically = Browse).

**Registry**
- `features/image-manager/registry/sections.ts` — `buildImageManagerSections(ctx)` factory. Single source of truth for tab list. Both modal and route call it.
- `features/image-manager/registry/types.ts` — `SectionDefinition`, `SectionContext`, `SectionId`.
- `SECTION_IDS` exports stable ids for deep-linking.

**API endpoints**
- `app/api/unsplash/route.ts` — Unsplash proxy (POST + GET). Consumes the server-only `UNSPLASH_ACCESS_KEY`. Used by both `components/official/PublicImageSearch.tsx` and `hooks/images/useUnsplashGallery.ts` (via `hooks/images/unsplashClient.ts`).
- `app/api/image-proxy/route.ts` — image proxy with Cache-Control + CORP. Sole survivor; the legacy `/api/proxy-image` was deleted.
- `app/api/images/upload/route.ts` — Sharp-based variant generator (powers the Branded Upload tab via `<ImageAssetUploader>`).

**Redux**
- No new slice — uses `cloudFiles` (from `features/files/`), the existing `SelectedImagesProvider` context, and the overlay slice for the floating viewer / floating gallery / settings deep-link.

---

## Data model

No new tables. Reads from:

- **`cloud_files`** (Supabase, owned by `features/files/`) — every upload lands here, every "Your Cloud" / "All Files" listing reads from here.
- **Supabase `auth.users.user_metadata`** — `Profile Photo` tab writes `avatar_url` and `picture` via `supabase.auth.updateUser`.

Key types:

- `SectionDefinition` (`features/image-manager/registry/types.ts`)
- `ImageSource` (`components/image/context/SelectedImagesProvider.tsx`) — `type: "public" | "temporary" | "local" | "bucket" | "cloud-file"` with optional cloud-file `metadata`.

---

## Architecture

### One registry, two surfaces

Both `<ImageManager>` and `<ImageManagerPageShell>` call `buildImageManagerSections(ctx)`. The shape:

```ts
interface SectionContext {
  variant: "route" | "modal";
  initialSearchTerm?: string;
  userImages?: string[];
  allowFileTypes?: string[];
  defaultUploadFolderPath?: string;
  defaultUploadFolderId?: string;
  defaultVisibility?: "private" | "public";
  acceptMimes?: string[];
  imageStudioProps?: Record<string, unknown>;
  showImageStudio?: boolean;
  showAIGenerate?: boolean;
  showTools?: boolean; // route only
  selectionMode?: "single" | "multiple" | "none";
}
```

The registry returns a flat `SectionDefinition[]` with `group: "primary" | "tools"`. The route shell splits them with a hairline divider; the modal filters `group === "primary"`.

### Selection modes

`useSelectedImages().selectionMode` is the single dispatcher:

| Mode       | What clicks do                                             | Where used        |
|------------|------------------------------------------------------------|-------------------|
| `single`   | Replace selection with this one image                       | route + modal     |
| `multiple` | Toggle this image in/out of selection                      | route + modal     |
| `none`     | Browse — open `ImageViewerWindow` via `useBrowseAction()`  | route only        |

The 3-way toggle in the route's sidebar persists last choice to `localStorage["image-manager:selection-mode"]`.

### Browse mode

`<BrowseImageProvider>` mounts at the route shell root (and inside the modal — it falls back to a no-op if no provider). Tabs that opt-in (currently `CloudImagesTab`, `CloudFilesTab`, `PublicImagesSection`, `ToolsTab`) call `useBrowseAction()` and short-circuit in `selectionMode === "none"` to dispatch `openImageViewer({ images, alts, initialIndex, title })`.

---

## Tabs (current registry)

Primary group:

1. **Public Images** (`PublicImagesSection`) — Curated Covers chip + Unsplash search. Curated covers come from `features/canvas/social/preset-covers.ts`.
2. **Your Cloud** (`CloudImagesTab`) — image-filtered view of `cloud_files`. Includes a per-tile `Info` button that opens the `CloudFileMetadataSheet` side drawer.
3. **All Files** (`CloudFilesTab`) — full cloud-files browser. Includes a "Photos" link to `/files/photos` for the deeper file-management view.
4. **Upload** (`CloudUploadTab`) — drag/drop/paste/picker. Includes a collapsible "Paste base64 instead" sub-tool (`Base64DecoderShell`).
5. **Branded Upload** (`BrandedUploadTab`) — wraps `<ImageAssetUploader>`. Presets: `social | cover | avatar | logo | favicon | square`. Generated variants are auto-pushed to `SelectedImagesProvider`.
6. **Image Studio** (`ImageStudioTab`) — embeds `<EmbeddedImageStudio hideTitle>`.
7. **Studio Library** (`StudioLibraryTab`) — read-only embed of the `Images/Generated/...` cloud folder. Resolves the folder ID via `ensureFolderPath`, then keys a `<CloudFilesTab>` to it.
8. **AI Generate** (`AIGenerateHero`) — placeholder. "Set defaults" button deep-links to the `ai.imageGeneration` settings tab.
9. **Profile Photo** (`ProfilePhotoTab`) — wraps `<ImageAssetUploader preset="avatar">`, calls `supabase.auth.updateUser({ data: { avatar_url, picture } })` on completion.

Tools group (route only):

10. **Tools** (`ToolsTab`) — single landing tile with a card grid:
   - Crop (`ImageCropperWithSelect` — inline expand)
   - Lightbox (`openImageViewer` over the current selection)
   - Floating Gallery (overlay `galleryWindow`)
   - Screenshot (`useScreenshot` → opens result in viewer)
   - Presets reference (link to `/image-studio/presets`)
   - Photos view (link to `/files/photos`)
   - Compact picker (link to admin official-components)
   - Favicons explainer (link to admin official-components)

Adding a new tile is a `ToolDescriptor` append — see `ToolsTab.tsx`.

---

## Key flows

### Adding a new tab

1. Create the tab component under `features/image-manager/components/<Name>Tab.tsx`. Consume `useSelectedImages()` and `useBrowseAction()` if it shows images.
2. Append to the appropriate group (`primary` or `tools`) in `features/image-manager/registry/sections.ts`. Add a stable id under `SECTION_IDS`.
3. Done — both modal and route pick it up automatically.

### Cloud upload flow

1. User picks/drops a file in `CloudUploadTab` (or pastes base64 into the sub-tool).
2. `useFileUpload` writes to `cloud_files` via the upload pipeline in `features/files/`.
3. New `CloudFileRecord` is added to the cloud-files Redux slice, which ripples into Your Cloud / All Files automatically (no refetch needed).
4. `CloudUploadTab` calls `addImage()` with the resolved URL so the upload becomes selectable in the footer preview row.

### Browse-mode click

1. Tab calls `useBrowseAction()` and gets a `browse(payload)` function.
2. On click, the tab resolves the visible images to URLs and dispatches `browse({ images, alts, initialIndex, title })`.
3. `<BrowseImageProvider>` invokes `openImageViewer(dispatch, payload)` from `ImageViewerWindow.tsx`, which dispatches `openOverlay({ overlayId: "imageViewer", instanceId: "default", data })`.
4. `OverlayController` mounts `ImageViewerWindow` with the payload spread as props.

### Branded upload flow (Sharp variants)

1. User picks a preset chip and uploads.
2. `<ImageAssetUploader>` POSTs to `/api/images/upload` with the preset key.
3. Server returns `{ image_url, primary_url, social_url, ... }` — every populated URL is auto-added to `SelectedImagesProvider` so the user can drag the variant into a form afterwards.

---

## Invariants & gotchas

- **Modal never enters Browse mode.** `selectionMode: "none"` is route-only. The modal hides the Image Studio tab when in `"none"` historically; the registry honors this via `showImageStudio !== false && selectionMode !== "none"`.
- **`group: "tools"` is route-only.** The modal calls `buildImageManagerSections({ variant: "modal", showTools: false })`. Don't put primary functionality under `tools`.
- **`SelectedImagesProvider.selectionMode === "none"` is "Browse".** Don't add a 4th mode — the contract is enumerated and consumed in two surfaces. Reuse `none`.
- **`Base64DecoderShell` lives in `features/image-studio`** — Image Manager imports it. If Image Studio moves, update the import in `CloudUploadTab.tsx`.
- **Server-only Unsplash key.** `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` was removed. Every Unsplash call goes through `/api/unsplash` via `hooks/images/unsplashClient.ts` (or the GET form for `PublicImageSearch`). Don't reintroduce a `NEXT_PUBLIC_*` Unsplash key.
- **`ImageManagerContent` is a deprecated alias** of `<ImageManager>` — kept for legacy callers. New code imports `ImageManager` directly.

---

## Related features

- **Depends on:** `features/files` (cloud-files redux + upload), `features/image-studio` (`EmbeddedImageStudio`, `Base64DecoderShell`, presets catalog), `features/window-panels` (`ImageViewerWindow`, `GalleryWindow`, overlay controller), `features/canvas/social` (curated covers).
- **Depended on by:** every product surface that uses `<ImageManager>` (chat, applets, recipes, agent UIs, admin tools).
- **Cross-links:**
  - `features/files/FEATURE.md`
  - `features/image-studio/FEATURE.md`
  - `features/window-panels/FEATURE.md`
  - `features/image-manager/IMAGE-FEATURE-INVENTORY.md` — running inventory of every image-related component in the codebase.
  - `features/image-manager/CLEANUP-CANDIDATES.md` — sign-off-required deletion list.

---

## Current work / migration state

The Image Manager Hub plan landed across Phases 1–7 (May 2026). Pending owner-approved deletions live in `CLEANUP-CANDIDATES.md`. Markdown image-block dedup (legacy `ImageBlock` vs `ImageOutputBlock`) is deferred and tracked in the same doc.

---

## Change log

- `2026-05-05` — Hub plan completed: section registry, 3-way selection mode (Browse/Single/Multi), `BrowseImageProvider`, Curated Covers, metadata sheet, Photos link, base64 paste, Branded Upload, Studio Library, Profile Photo tabs, Tools group, Unsplash server proxy, `proxy-image` deleted, `ImageManagerContent.tsx` deleted, cleanup candidates listed.
