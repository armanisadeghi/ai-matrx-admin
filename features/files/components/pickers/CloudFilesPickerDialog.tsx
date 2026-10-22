"use client";

// The `cloudFilesPicker` overlay's render: the file picker window (single or multi), the folder picker, or Save As,
// answering the request `openFilePicker` / `openFolderPicker` / `openSaveAs` filed (cloudFilesPickerOpeners.ts).
import { useRef, useState } from "react";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";
import { useOverlayRequest } from "@ai-matrx/summon/react";
import { FilePickerWindow } from "@/features/resource-manager/resource-picker/FilePickerWindow";
import type { FilesResourcePickerFilter } from "@/features/resource-manager/resource-picker/FilesResourcePicker";
import { FolderPicker } from "./FolderPicker";
import { SaveAsDialog, type SaveAsDestination } from "./SaveAsDialog";
import type { CloudFilesPickerAnswer, CloudFilesPickerRequest, UseFilePickerOpenOptions } from "./cloudFilesPickerOpeners";

function filterFromExtensions(
  extensions: string[] | undefined,
): FilesResourcePickerFilter {
  if (!extensions || extensions.length === 0) return "all";
  const set = new Set(
    extensions.map((e) => e.toLowerCase().replace(/^\./, "")),
  );
  if ([...set].every((e) => e === "pdf")) return "pdfs";
  const imageExts = ["jpg", "jpeg", "png", "webp", "avif", "gif", "svg"];
  if ([...set].every((e) => imageExts.includes(e))) return "photos";
  return "all";
}

function FilePick({ options, settle }: { options: UseFilePickerOpenOptions; settle: (ids: string[] | null) => void }) {
  const multi = options.multi ?? false;
  const picked = useRef<string[]>([]);
  const [pickedCount, setPickedCount] = useState(0);
  return (
    <FilePickerWindow
      open
      onClose={() => settle(picked.current.length > 0 ? [...picked.current] : null)}
      scopeId="cloud-files-host"
      title={options.title ?? "Choose a file"}
      initialFilter={filterFromExtensions(options.allowedExtensions)}
      onPick={(selection) => {
        if (!multi) {
          settle([selection.fileId]);
          return "close";
        }
        if (!picked.current.includes(selection.fileId)) {
          picked.current.push(selection.fileId);
          setPickedCount(picked.current.length);
        }
        return undefined;
      }}
      multi={multi}
      pickedCount={pickedCount}
      onUnpick={(fileId) => {
        picked.current = picked.current.filter((id) => id !== fileId);
        setPickedCount(picked.current.length);
      }}
      organizationFilter={options.organizationFilter ?? null}
      uploadOrganizationId={options.uploadOrganizationId ?? null}
    />
  );
}

export default function CloudFilesPickerDialog({ data, close }: OverlayRenderProps) {
  const { request, settle } = useOverlayRequest<CloudFilesPickerRequest, CloudFilesPickerAnswer>(data, close);
  if (!request) return null;
  if (request.mode === "file") return <FilePick options={request.options} settle={settle} />;
  if (request.mode === "folder") {
    const o = request.options;
    return (
      <FolderPicker
        open
        onOpenChange={(next) => {
          if (!next) settle(undefined);
        }}
        onSelect={(folderId) => settle(folderId)}
        initialFolderId={o.initialFolderId}
        title={o.title}
        description={o.description}
      />
    );
  }
  const o = request.options;
  return (
    <SaveAsDialog
      open
      onOpenChange={(next) => {
        if (!next) settle(null);
      }}
      onSave={(dest: SaveAsDestination) => settle(dest)}
      defaultFileName={o.defaultFileName}
      initialFolderId={o.initialFolderId ?? null}
      title={o.title}
      description={o.description}
      confirmLabel={o.confirmLabel}
    />
  );
}
