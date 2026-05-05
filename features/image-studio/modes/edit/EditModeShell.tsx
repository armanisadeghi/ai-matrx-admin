"use client";

/**
 * Edit mode — full-featured image editor.
 *
 * Wraps `react-filerobot-image-editor` (5.0.1) which gives us in one
 * component: crop, rotate, flip, resize, fine-tune (brightness/contrast/HSV/
 * warmth/blur/threshold/posterize/pixelate/noise), filters, freehand pen,
 * shapes (rect/ellipse/polygon/line/arrow), text, watermark.
 *
 * On top of Filerobot's native toolbar we layer four AI assists:
 *   • ✨ Suggest edits  → `image-suggest-edits` agent
 *   • Background remove → `bg-remove` Python endpoint
 *   • Upscale (2× / 4×) → `upscale` Python endpoint
 *   • Generate variant  → `image-edit` (instruction prompt) endpoint
 *
 * All AI helpers consume + produce cloud_file_ids — when one returns, the
 * editor reloads its source from the result so the user can keep editing.
 */

import { useCallback, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Loader2, Save, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useImageSource } from "../shared/use-image-source";
import { saveEditedImage } from "../shared/save-edited-image";
import type { ModeShellProps } from "../shared/types";
import { EditAiToolbar } from "./EditAiToolbar";

const FilerobotImageEditor = dynamic(
  () => import("react-filerobot-image-editor"),
  { ssr: false, loading: () => <EditorSkeleton /> },
);

interface SavedImage {
  imageBase64?: string;
  fullName?: string;
  mimeType: string;
  extension: string;
  name: string;
}

const EDIT_FOLDER = "Images/Edited";

export function EditModeShell({
  source,
  defaultFolder = EDIT_FOLDER,
  presentation = "page",
  onSave,
  onCancel,
}: ModeShellProps) {
  const { url, filename } = useImageSource(source);
  const themeMode = useThemeMode();
  const [saving, setSaving] = useState(false);
  // Allows AI ops to swap the underlying source mid-edit. We bump a key to
  // force-remount Filerobot when this changes (it's not designed to react
  // to a runtime `source` prop change).
  const [overrideUrl, setOverrideUrl] = useState<string | null>(null);
  const [overrideFilename, setOverrideFilename] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const activeUrl = overrideUrl ?? url;
  const activeFilename = overrideFilename ?? filename;

  const handleAiResult = useCallback((newUrl: string, newName: string) => {
    setOverrideUrl(newUrl);
    setOverrideFilename(newName);
    setReloadKey((k) => k + 1);
    toast.success("AI result loaded into the editor.");
  }, []);

  const handleSave = useCallback(
    async (saved: SavedImage) => {
      if (!saved.imageBase64) {
        toast.error("Editor returned no image data.");
        return;
      }
      setSaving(true);
      try {
        const blob = base64ToBlob(saved.imageBase64, saved.mimeType);
        const result = await saveEditedImage({
          blob,
          filename: saved.fullName ?? `${saved.name}.${saved.extension}`,
          folderPath: defaultFolder,
          mime: saved.mimeType,
          metadata: { kind: "edit", source_filename: filename },
        });
        toast.success("Saved.");
        onSave?.(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed";
        toast.error(msg);
      } finally {
        setSaving(false);
      }
    },
    [defaultFolder, filename, onSave],
  );

  // Filerobot's onSave is sync but our save is async — fire and forget,
  // we surface progress via toasts + the saving state.
  const onFilerobotSave = useCallback(
    (saved: SavedImage) => {
      void handleSave(saved);
    },
    [handleSave],
  );

  if (!activeUrl) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        No image loaded. Pass a <code className="mx-1">?url=</code> or{" "}
        <code className="mx-1">?file=</code> query parameter, or open this from
        a Cloud Files row.
      </div>
    );
  }

  const stem = stripExt(activeFilename);

  return (
    <div className="h-full min-h-0 flex flex-col">
      <EditAiToolbar
        sourceCloudFileId={
          source?.kind === "cloudFileId" ? source.cloudFileId : null
        }
        sourceUrl={activeUrl}
        onResult={handleAiResult}
      />
      <div className="flex-1 min-h-0 relative">
        <FilerobotImageEditor
          key={reloadKey}
          source={activeUrl}
          theme={themeMode === "dark" ? darkTheme : lightTheme}
          onSave={onFilerobotSave}
          onClose={() => onCancel?.()}
          defaultSavedImageName={`${stem}-edited`}
          defaultSavedImageType="png"
          defaultSavedImageQuality={0.95}
          savingPixelRatio={2}
          previewPixelRatio={1}
          showBackButton={presentation === "modal"}
          avoidChangesNotSavedAlertOnLeave={false}
          tabsIds={[
            "Adjust",
            "Finetune",
            "Filters",
            "Annotate",
            "Watermark",
            "Resize",
          ]}
          defaultTabId="Adjust"
          defaultToolId="Crop"
        />
        {saving && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-50">
            <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-card border border-border shadow">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Saving…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="h-full p-4 flex flex-col gap-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="flex-1 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

function stripExt(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(0, dot) : filename;
}

function base64ToBlob(base64DataUrl: string, mime: string): Blob {
  const commaIdx = base64DataUrl.indexOf(",");
  const data =
    commaIdx >= 0 ? base64DataUrl.slice(commaIdx + 1) : base64DataUrl;
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// Filerobot's theme overrides — keep them tight, only override colors
// that clash with our design tokens. The rest inherits from @scaleflex/ui
// defaults.
const lightTheme = {
  palette: {
    "bg-primary-active": "rgb(59 130 246)",
    "accent-primary": "rgb(59 130 246)",
    "accent-primary-active": "rgb(37 99 235)",
  },
};

const darkTheme = {
  palette: {
    "bg-primary": "rgb(15 23 42)",
    "bg-primary-active": "rgb(30 41 59)",
    "bg-secondary": "rgb(30 41 59)",
    "icons-primary": "rgb(226 232 240)",
    "accent-primary": "rgb(96 165 250)",
    "accent-primary-active": "rgb(59 130 246)",
    "borders-secondary": "rgb(51 65 85)",
    "borders-primary": "rgb(71 85 105)",
    "borders-strong": "rgb(100 116 139)",
    "light-shadow": "transparent",
    "warning-primary": "rgb(251 146 60)",
  },
};

// Re-export the close button trio so the modal-mode wrapper can render its
// own header without duplicating styles.
export { Sparkles, Save, X };

// Track dark/light by reading the `dark` class on <html>. Mirrors the
// pattern used by `components/ui/sonner.tsx` so we don't pull in
// next-themes for a single boolean.
function useThemeMode(): "light" | "dark" {
  return useSyncExternalStore<"light" | "dark">(
    (onChange) => {
      if (typeof document === "undefined") return () => {};
      const obs = new MutationObserver(onChange);
      obs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return () => obs.disconnect();
    },
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
        ? "dark"
        : "light",
    () => "dark",
  );
}
