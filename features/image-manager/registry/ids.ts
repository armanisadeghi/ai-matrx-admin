/**
 * features/image-manager/registry/ids.ts
 *
 * Stable section ids for the Image Manager hub. Kept in its own file with
 * **zero** imports so consumers (notably `components/image/ImageManager.tsx`,
 * which is itself transitively imported by tab components) can read these
 * ids without pulling in the heavy section registry — that registry imports
 * every tab component, several of which import `<ImageManager>` itself, so
 * importing it from the modal would form a circular dependency.
 *
 * If you need to add a new section id, add it here and reference it from
 * `sections.ts` (which re-exports `SECTION_IDS` for callers that already
 * `import { SECTION_IDS } from ".../registry/sections"`).
 */

export const SECTION_IDS = {
  publicSearch: "public-search",
  myImages: "my-images",
  myFiles: "my-files",
  upload: "upload",
  brandedUpload: "branded-upload",
  /**
   * "Studio Light" — the embedded studio (`<EmbeddedImageStudio>`) tuned for
   * the picker workflow. The id stays `image-studio` so any persisted
   * `localStorage` state from before the rename keeps working.
   */
  imageStudio: "image-studio",
  /**
   * "Image Studio" — the full three-column shell (`<ImageStudioShell>`) that
   * powers `/images/convert`, embedded in-page so users never leave
   * the modal.
   */
  studioFull: "studio-full",
  studioLibrary: "studio-library",
  profilePhoto: "profile-photo",
  aiGenerate: "ai-generate",
  tools: "tools",
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];
