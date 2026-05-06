/**
 * features/image-manager/registry/sections.ts
 *
 * Single source of truth for the Image Manager hub's section list.
 *
 * Both the legacy modal (`<ImageManager>`) and the route shell
 * (`<ImageManagerPageShell>`) call `buildImageManagerSections(ctx)` and
 * render the resulting `SectionDefinition[]` in their own way.
 *
 * To add a new section:
 *   1. Append an entry to `PRIMARY_SECTIONS` or `TOOL_SECTIONS` below
 *      (whichever group fits).
 *   2. Done. The route picks it up in the sidebar; the modal picks it up
 *      as a tab.
 */

import React from "react";
import {
  Cloud,
  FolderTree,
  ImageIcon,
  Library,
  Sparkles,
  Stamp,
  Upload,
  User,
  Wand2,
} from "lucide-react";

import { CloudImagesTab } from "@/components/image/cloud/CloudImagesTab";
import { CloudFilesTab } from "@/components/image/cloud/CloudFilesTab";
import { CloudUploadTab } from "@/components/image/cloud/CloudUploadTab";
import { ImageStudioTab } from "@/components/image/cloud/ImageStudioTab";

import type { SectionContext, SectionDefinition } from "./types";
import { AIGenerateHero } from "../components/AIGenerateHero";
import { PublicImagesSection } from "../components/PublicImagesSection";
import { BrandedUploadTab } from "../components/BrandedUploadTab";
import { StudioLibraryTab } from "../components/StudioLibraryTab";

// ---------------------------------------------------------------------------
// Stable section ids — exported so callers can deep-link without typos.
// ---------------------------------------------------------------------------

export const SECTION_IDS = {
  publicSearch: "public-search",
  myImages: "my-images",
  myFiles: "my-files",
  upload: "upload",
  brandedUpload: "branded-upload",
  imageStudio: "image-studio",
  studioLibrary: "studio-library",
  aiGenerate: "ai-generate",
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Build the Image Manager section list.
 *
 * Honors the same flags the modal historically used:
 * - `showImageStudio` (default `true`) — modal hides studio in `selectionMode === "none"`.
 * - `showAIGenerate` (default `true`).
 * - `showTools` (default `true` for route, `false` for modal).
 */
export function buildImageManagerSections(
  ctx: SectionContext,
): SectionDefinition[] {
  const showImageStudio =
    ctx.showImageStudio !== false && ctx.selectionMode !== "none";
  const showAIGenerate = ctx.showAIGenerate !== false;

  const primary: SectionDefinition[] = [
    {
      id: SECTION_IDS.publicSearch,
      label: "Public Images",
      icon: ImageIcon,
      iconColor: "text-sky-500",
      group: "primary",
      hint: "Curated covers and Unsplash search.",
      render: () =>
        React.createElement(PublicImagesSection, {
          initialSearchTerm: ctx.initialSearchTerm,
        }),
    },
    {
      id: SECTION_IDS.myImages,
      label: "Your Cloud",
      icon: Cloud,
      iconColor: "text-violet-500",
      group: "primary",
      hint: "Image-filtered view of your cloud library.",
      render: () =>
        React.createElement(CloudImagesTab, {
          providedUrls:
            ctx.userImages && ctx.userImages.length > 0
              ? ctx.userImages
              : undefined,
        }),
    },
    {
      id: SECTION_IDS.myFiles,
      label: "All Files",
      icon: FolderTree,
      iconColor: "text-amber-500",
      group: "primary",
      hint: "Full cloud-files browser (folders + non-image files).",
      render: () =>
        React.createElement(CloudFilesTab, {
          allowFileTypes: ctx.allowFileTypes ?? ["image"],
        }),
    },
    {
      id: SECTION_IDS.upload,
      label: "Upload",
      icon: Upload,
      iconColor: "text-emerald-500",
      group: "primary",
      hint: "Drag, drop, paste or pick — saves to your cloud.",
      render: () =>
        React.createElement(CloudUploadTab, {
          defaultUploadFolderPath: ctx.defaultUploadFolderPath,
          defaultUploadFolderId: ctx.defaultUploadFolderId,
          visibility: ctx.defaultVisibility,
          accept: ctx.acceptMimes,
        }),
    },
    {
      id: SECTION_IDS.brandedUpload,
      label: "Branded",
      icon: Stamp,
      iconColor: "text-orange-500",
      group: "primary",
      hint: "Generate cover / OG / thumb / favicon variants from one image.",
      render: () => React.createElement(BrandedUploadTab),
    },
  ];

  if (showImageStudio) {
    primary.push({
      id: SECTION_IDS.imageStudio,
      label: "Image Studio",
      icon: Wand2,
      iconColor: "text-fuchsia-500",
      group: "primary",
      hint: "Crop and generate platform-ready variants.",
      render: () =>
        React.createElement(ImageStudioTab, {
          imageStudioProps: ctx.imageStudioProps,
        }),
    });
    primary.push({
      id: SECTION_IDS.studioLibrary,
      label: "Studio Library",
      icon: Library,
      iconColor: "text-pink-500",
      group: "primary",
      hint: "Read-only view of every Studio save.",
      render: () => React.createElement(StudioLibraryTab),
    });
  }

  if (showAIGenerate) {
    primary.push({
      id: SECTION_IDS.aiGenerate,
      label: "AI Generate",
      icon: Sparkles,
      iconColor: "text-rose-500",
      group: "primary",
      hint: "Describe an image and generate it.",
      placeholder: true,
      render: () => React.createElement(AIGenerateHero),
    });
  }

  // Phase 3 tool sections are appended later in this same builder. Until
  // those land, we expose nothing under "tools" so the modal/route render
  // an unchanged primary list.
  const tools: SectionDefinition[] = [];

  return [...primary, ...(ctx.showTools !== false ? tools : [])];
}
