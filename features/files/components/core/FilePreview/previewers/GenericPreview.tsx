/**
 * features/files/components/core/FilePreview/previewers/GenericPreview.tsx
 *
 * Fallback when no specific previewer is available. Shows an icon, file
 * metadata, and a prominent Download action.
 */

"use client";

import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileIcon } from "@/features/files/components/core/FileIcon/FileIcon";
import { formatFileSize } from "@/features/files/utils/format";

export interface GenericPreviewProps {
  fileName: string;
  fileSize: number | null;
  onDownload?: () => void;
  message?: string;
  className?: string;
}

export function GenericPreview({
  fileName,
  fileSize,
  onDownload,
  message,
  className,
}: GenericPreviewProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center",
        className,
      )}
    >
      <FileIcon fileName={fileName} size={48} />
      <div>
        <p className="text-sm font-medium truncate max-w-md">{fileName}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(fileSize)}
        </p>
      </div>
      <p className="text-sm text-muted-foreground max-w-sm">
        {message ?? "This file type can't be previewed here."}
      </p>
      {onDownload ? (
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
      ) : null}
    </div>
  );
}

export default GenericPreview;
