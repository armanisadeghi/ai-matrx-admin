"use client";

/**
 * components/image/ImageManager.tsx
 *
 * Full-screen image picker. As of the cloud-files rebuild, every tab
 * is wired into the user's cloud storage (`features/files`) — uploads
 * land in the user's account, "My Images" / "My Files" surface the
 * live cloud tree, and the embedded Image Studio writes its variants
 * to permanent CDN URLs.
 *
 * Public surface stays backwards compatible. The legacy
 * `userImages` / `saveTo` / `bucket` / `path` props still work and
 * are mapped onto the new cloud props.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import FullScreenOverlay from "@/components/official/FullScreenOverlay";
import type { TabDefinition } from "@/components/official/FullScreenOverlay";
import { Button } from "@/components/ui/button";
import { ImagePreviewRow } from "@/components/image/shared/ImagePreviewRow";
import { ResponsiveGallery } from "@/components/image/ResponsiveGallery";
import { useSelectedImages } from "@/components/image/context/SelectedImagesProvider";
import { CloudImagesTab } from "@/components/image/cloud/CloudImagesTab";
import {
  CloudFilesTab,
  type AllowedFileKind,
} from "@/components/image/cloud/CloudFilesTab";
import { CloudUploadTab } from "@/components/image/cloud/CloudUploadTab";
import { ImageStudioTab } from "@/components/image/cloud/ImageStudioTab";
import type { EmbeddedImageStudioProps } from "@/features/image-studio/components/EmbeddedImageStudio";
import type { Visibility } from "@/features/files/types";

export interface ImageManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  initialSelectionMode?: "single" | "multiple" | "none";
  initialTab?: string;
  /** Initial query for the Public Images Unsplash search. */
  initialSearchTerm?: string;
  /** Legacy: user-supplied URLs rendered inside "My Images" as a "Provided" row. */
  userImages?: string[];
  /** Lock the selection mode toggle in the footer. */
  enforceSelectionMode?: boolean;
  /** Filter the visible tab set; empty/undefined shows all. */
  visibleTabs?: string[];

  // ─── Legacy upload props (mapped onto defaultUploadFolderPath) ───
  saveTo?: "public" | "private";
  bucket?: string;
  path?: string;

  // ─── New cloud-files props (all optional) ───
  /** Which file kinds appear / are selectable in the "My Files" tab. Default `["image"]`. */
  allowFileTypes?: AllowedFileKind[];
  /** Logical folder path for new uploads. Default: `"Images/Uploads"`. */
  defaultUploadFolderPath?: string;
  /** Pre-resolved upload-destination folder id. */
  defaultUploadFolderId?: string | null;
  /** Visibility for new uploads. Default `"private"` (Image Studio uses public). */
  defaultVisibility?: Visibility;
  /** Show the Image Studio tab. Default `true`. */
  showImageStudioTab?: boolean;
  /** Show the AI Generate placeholder tab. Default `true`. */
  showAIGenerateTab?: boolean;
  /** Override props for the embedded `<EmbeddedImageStudio>`. */
  imageStudioProps?: Partial<EmbeddedImageStudioProps>;
}

const TAB_PUBLIC = "public-search";
const TAB_MY_IMAGES = "my-images";
const TAB_MY_FILES = "my-files";
const TAB_UPLOAD = "upload";
const TAB_IMAGE_STUDIO = "image-studio";
const TAB_AI_GENERATE = "ai-generate";

/**
 * Legacy tab IDs (pre cloud-files rebuild) mapped to their replacements,
 * so callers passing the old strings via `initialTab` / `visibleTabs`
 * continue to land on a sensible tab.
 */
const LEGACY_TAB_ALIASES: Record<string, string> = {
  "user-images": TAB_MY_IMAGES,
  "upload-images": TAB_UPLOAD,
  "paste-images": TAB_UPLOAD,
  "quick-upload": TAB_UPLOAD,
  "cloud-images": TAB_MY_FILES,
  "image-generation": TAB_AI_GENERATE,
};

function aliasTabId(id: string): string {
  return LEGACY_TAB_ALIASES[id] ?? id;
}

/**
 * Map the legacy `saveTo` / `bucket` / `path` props onto a cloud-files
 * folder path. This keeps every existing caller working without code
 * changes — the path scheme matches what `useFileUploadWithStorage`
 * mapped to internally.
 */
function legacyPropsToFolderPath(
  saveTo: "public" | "private" | undefined,
  bucket: string | undefined,
  path: string | undefined,
  explicitPath: string | undefined,
): string | undefined {
  if (explicitPath) return explicitPath;
  if (bucket) return path ? `${bucket}/${path}` : bucket;
  if (saveTo === "public") return "Images/Uploads/Public";
  if (saveTo === "private") return "Images/Uploads/Private";
  return undefined; // fall through to CloudUploadTab default
}

export function ImageManagerContent({
  isOpen,
  onClose,
  onSave,
  initialSelectionMode = "multiple",
  initialTab = TAB_PUBLIC,
  initialSearchTerm,
  userImages,
  enforceSelectionMode = false,
  visibleTabs,
  saveTo,
  bucket,
  path,
  allowFileTypes = ["image"],
  defaultUploadFolderPath,
  defaultUploadFolderId,
  defaultVisibility = "private",
  showImageStudioTab = true,
  showAIGenerateTab = true,
  imageStudioProps,
}: ImageManagerProps) {
  const { selectedImages, selectionMode, setSelectionMode, clearImages } =
    useSelectedImages();

  const [activeTab, setActiveTab] = useState(() => aliasTabId(initialTab));

  const aliasedVisibleTabs = useMemo(() => {
    if (!visibleTabs || visibleTabs.length === 0) return undefined;
    // De-dupe after aliasing — paste-images + upload-images both map to "upload".
    return Array.from(new Set(visibleTabs.map(aliasTabId)));
  }, [visibleTabs]);

  // Set selection mode once on mount — same behaviour as the legacy
  // component to avoid surprising existing callers.
  useEffect(() => {
    setSelectionMode(initialSelectionMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Defer-clear on close so the parent has time to read the selection.
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        clearImages();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, clearImages]);

  const resolvedUploadPath = useMemo(
    () =>
      legacyPropsToFolderPath(saveTo, bucket, path, defaultUploadFolderPath),
    [saveTo, bucket, path, defaultUploadFolderPath],
  );

  const effectiveDefaultVisibility = useMemo<Visibility>(() => {
    if (defaultVisibility) return defaultVisibility;
    // Legacy: saveTo === "public" implies public visibility.
    if (saveTo === "public") return "public";
    return "private";
  }, [defaultVisibility, saveTo]);

  const acceptMimes = useMemo(() => {
    if (allowFileTypes.includes("any")) return undefined;
    const set = new Set<string>();
    if (allowFileTypes.includes("image")) set.add("image/*");
    if (allowFileTypes.includes("video")) set.add("video/*");
    if (allowFileTypes.includes("audio")) set.add("audio/*");
    if (allowFileTypes.includes("pdf")) set.add("application/pdf");
    if (allowFileTypes.includes("document")) {
      set.add("text/*");
      set.add("application/pdf");
    }
    return Array.from(set);
  }, [allowFileTypes]);

  const handleSave = () => {
    onSave?.();
    onClose();
  };

  const handleCancel = () => {
    clearImages();
    onClose();
  };

  const allTabs: TabDefinition[] = useMemo(() => {
    const tabs: TabDefinition[] = [
      {
        id: TAB_PUBLIC,
        label: "Public Images",
        content: (
          <div className="h-full flex flex-col">
            <div className="flex-1 p-4 overflow-auto">
              <ResponsiveGallery
                type="unsplash"
                initialSearchTerm={initialSearchTerm}
              />
            </div>
          </div>
        ),
      },
      {
        id: TAB_MY_IMAGES,
        label: "My Images",
        content: (
          <CloudImagesTab
            providedUrls={
              userImages && userImages.length > 0 ? userImages : undefined
            }
          />
        ),
      },
      {
        id: TAB_MY_FILES,
        label: "My Files",
        content: <CloudFilesTab allowFileTypes={allowFileTypes} />,
      },
      {
        id: TAB_UPLOAD,
        label: "Upload",
        content: (
          <CloudUploadTab
            defaultUploadFolderPath={resolvedUploadPath}
            defaultUploadFolderId={defaultUploadFolderId}
            visibility={effectiveDefaultVisibility}
            accept={acceptMimes}
          />
        ),
      },
    ];

    if (showImageStudioTab && initialSelectionMode !== "none") {
      tabs.push({
        id: TAB_IMAGE_STUDIO,
        label: "Image Studio",
        content: <ImageStudioTab imageStudioProps={imageStudioProps} />,
      });
    }

    if (showAIGenerateTab) {
      tabs.push({
        id: TAB_AI_GENERATE,
        label: "AI Generate",
        content: <AIGeneratePlaceholder />,
      });
    }

    return tabs;
  }, [
    initialSearchTerm,
    userImages,
    allowFileTypes,
    resolvedUploadPath,
    defaultUploadFolderId,
    effectiveDefaultVisibility,
    acceptMimes,
    showImageStudioTab,
    initialSelectionMode,
    imageStudioProps,
    showAIGenerateTab,
  ]);

  const tabs = useMemo(
    () =>
      aliasedVisibleTabs && aliasedVisibleTabs.length > 0
        ? allTabs.filter((tab) => aliasedVisibleTabs.includes(tab.id))
        : allTabs,
    [allTabs, aliasedVisibleTabs],
  );

  // If the active tab is filtered out, fall back to the first visible.
  useEffect(() => {
    if (!aliasedVisibleTabs || aliasedVisibleTabs.length === 0) return;
    if (!aliasedVisibleTabs.includes(activeTab)) {
      setActiveTab(aliasedVisibleTabs[0]);
    }
  }, [aliasedVisibleTabs, activeTab]);

  return (
    <FullScreenOverlay
      isOpen={isOpen}
      onClose={onClose}
      title="Image Manager"
      description="Browse, upload, and create images — everything saves to your cloud."
      tabs={tabs}
      initialTab={activeTab}
      onTabChange={setActiveTab}
      showSaveButton={true}
      onSave={handleSave}
      saveButtonLabel="Use Selected"
      showCancelButton={true}
      onCancel={handleCancel}
      cancelButtonLabel="Cancel"
      footerContent={
        <div className="flex items-center mr-auto gap-4">
          {!enforceSelectionMode ? (
            <div className="flex items-center gap-2">
              <Button
                variant={selectionMode === "single" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectionMode("single")}
              >
                Single
              </Button>
              <Button
                variant={selectionMode === "multiple" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectionMode("multiple")}
              >
                Multiple
              </Button>
            </div>
          ) : null}

          <div className="text-sm text-muted-foreground">
            {selectedImages.length} image
            {selectedImages.length !== 1 ? "s" : ""} selected
          </div>

          <div className="w-64">
            <ImagePreviewRow size="s" />
          </div>
        </div>
      }
    />
  );
}

export function ImageManager(props: ImageManagerProps) {
  return <ImageManagerContent {...props} />;
}

// ---------------------------------------------------------------------------
// AI Generate placeholder — a clean "coming soon" hero. The real surface
// will mount an agent shortcut here.
// ---------------------------------------------------------------------------

function AIGeneratePlaceholder() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Sparkles className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          AI Image Generation
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Generate images directly from a description — coming soon. We're
          wiring an agent here so you can describe an image in plain English and
          have it appear in your cloud, ready to use.
        </p>
      </div>
    </div>
  );
}
