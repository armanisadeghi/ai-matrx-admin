# Image Module Audit

| Touchpoint | Location | Disposition | Notes |
|------------|----------|-------------|-------|
| ImageStudioShell + all studio components | `features/image-studio/components/` | Absorbed → `features/images/components/studio/` | 20+ files copied; route pages updated to new imports |
| useImageStudio, useBase64Decoder | `features/image-studio/hooks/` | Absorbed → `features/images/hooks/` | — |
| crop-file, compute-crop, slugify-filename, etc. | `features/image-studio/utils/` | Absorbed → `features/images/utils/` | — |
| presets.ts | `features/image-studio/presets.ts` | Absorbed → `features/images/presets.ts` | — |
| studio-types.ts | `features/image-studio/types.ts` | Alias at `features/images/studio-types.ts` | Original image-studio types preserved for compatibility |
| GalleryFloatingWorkspace | `features/gallery/components/` | Replaced → `ImageManager` in GalleryWindow | Unsplash search available via ImageSearch on /images/search |
| GalleryWindow | `features/window-panels/windows/image/` | Updated to use `ImageManager` panel | Registry and WindowPanel shell unchanged |
| ImageViewerWindow | `features/window-panels/windows/image/` | Kept as-is | Feature-rich zoom/pan/keyboard nav viewer — no regression |
| ImageUploaderWindow | `features/window-panels/windows/image/` | Kept as-is | Complex callbackGroupId system — `ImageCapture` can't replace |
| /api/proxy-image | `app/api/proxy-image/` | Deleted | `/api/image-proxy` is canonical; no callers found |
| /api/images/upload | `app/api/images/upload/` | Kept as-is | Sharp processing server route |
| /api/images/studio/process | `app/api/images/studio/process/` | Kept as-is | Studio batch-processing route |
| /api/image-proxy | `app/api/image-proxy/` | Kept as-is | Canonical image proxy |
| ImageAssetUploader | `components/official/` | Referenced by ImageUploaderWindow | Not moved — official component |
| ImageCropper variants | `components/official/image-cropper/` | Referenced by /images/crop page | Not moved — official component |
| PublicImageSearch | `components/official/` | Referenced by ImageSearch | Not moved — official component |
| utils/image/imageCompression.ts | `utils/` | Referenced by useImageCapture | Not moved |
| features/scraper/ images tab | `features/scraper/parts/tabs/images/` | Extended | Save-to-cloud action added via useImageCapture |
| app/(authenticated)/image-editing/ | `app/(authenticated)/image-editing/` | Redirected | All sub-routes redirect to /images/* |
| app/(a)/image-studio/* | `app/(a)/image-studio/` | Kept as-is | Routes still work; imports already point to features/images |
| app/(a)/images/* | `app/(a)/images/` | **New** | Unified route tree with sidebar layout |
