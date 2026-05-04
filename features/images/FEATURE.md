# Images Feature

Unified image management module consolidating all image functionality into a single feature.

## What it does

- **Manager** (`/images/manager`): Browse and manage cloud-stored images with grid/masonry layout
- **Search** (`/images/search`): Public image search (Unsplash) via `PublicImageSearch` official component
- **Studio** (`/images/studio`): Multi-preset image processing with Sharp — crop, resize, convert, export
- **Crop** (`/images/crop`): Quick crop utility using `ImageCropperWithSelect` official component
- **Capture**: Unified paste/drop/file-pick → upload pipeline via `useImageCapture` + `ImageCapture`
- **AI Editor** (`/images/[id]`): Scaffold for AI-powered image editing (backend not yet wired)

## Entry points

| Surface | Route / Component |
|---------|------------------|
| Page | `app/(a)/images/` → sidebar nav with manager, search, studio, crop |
| Window panel | `GalleryWindow` → `ImageManager` in panel surface |
| Upload panel | `ImageUploaderWindow` → `ImageAssetUploader` (official component, unchanged) |
| Capture overlay | `ImageCapture` with `globalPaste={true}` |

## Architecture

```
features/images/
  types.ts              — ImageRecord, ImageSurface, ImageViewMode, UploadQueueItem
  constants.ts          — IMAGE_FOLDERS, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB
  presets.ts            — Studio preset definitions (absorbed from image-studio)
  services/
    image.service.ts    — listImages(), removeImage() — wraps features/files
  redux/
    imageSlice.ts       — selectedImageId, activeTab, viewMode, activeFolderPath, uploadQueue
  hooks/
    useImageStudio.ts   — Full studio state machine
    useBase64Decoder.ts — Base64 decode flow
  utils/                — crop-file, compute-crop, slugify-filename, format-bytes, etc.
  components/
    ImagesSidebar.tsx   — Nav sidebar for /images/* routes
    capture/
      useImageCapture.ts  — Hook: paste + drop + pick → upload pipeline
      ImageCapture.tsx    — Drop zone / file picker UI
    manager/
      useImages.ts        — Loads ImageRecord[] from image.service
      ImageManager.tsx    — Grid + toolbar + upload trigger, surface-aware
      ImageManagerGrid.tsx
      ImageManagerToolbar.tsx
    search/
      ImageSearch.tsx     — Wraps PublicImageSearch
    viewer/
      ImageViewer.tsx     — Single ImageRecord viewer with download/open-original
    studio/               — All studio components (absorbed from features/image-studio)
    ai-editor/
      AIImageEditor.tsx   — AI edit scaffold (model select + prompt input)
```

## Surface prop contract

All top-level components accept `surface?: 'page' | 'overlay' | 'panel'`:
- `page` — full desktop layout (default)
- `overlay` — modal/dialog sizing
- `panel` — compact layout for floating window panels

## Data flow

1. `useImages(folderPath)` calls `image.service.listImages(folderPath)`
2. `image.service` calls `features/files/api/files.listFiles()` and filters to `image/*` MIME types
3. Results stored as `ImageRecord[]` in local state (not Redux — transient list data)
4. Redux `imageSlice` tracks: selected image, active tab, view mode, upload queue

## Change Log

- **2026-05-05**: Initial feature created. Absorbed `features/image-studio/` into `features/images/components/studio/`. Created unified route tree at `/images/*`. Updated `GalleryWindow` to use `ImageManager`. Added `ImageCapture` save-to-cloud in scraper. Redirected legacy `/image-editing/*` routes.
