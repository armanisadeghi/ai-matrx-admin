/**
 * features/files/components/core/FilePreview/FilePreview.tsx
 *
 * Preview registry — picks the right previewer for a file based on
 * mime-type + category, and lazy-loads heavy ones (PDF) via next/dynamic
 * so they don't bloat the base bundle.
 */

"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectFileById } from "../../../redux/selectors";
import { useSignedUrl } from "../../../hooks/useSignedUrl";
import { useFileActions } from "../FileActions";
import { getPreviewCapability } from "../../../utils/preview-capabilities";
import { ImagePreview } from "./previewers/ImagePreview";
import { VideoPreview } from "./previewers/VideoPreview";
import { AudioPreview } from "./previewers/AudioPreview";
import { TextPreview } from "./previewers/TextPreview";
import { GenericPreview } from "./previewers/GenericPreview";

// Heavy — only loaded when a PDF is actually opened (bundle-dynamic-imports).
const PdfPreview = dynamic(() => import("./previewers/PdfPreview"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-6 w-40 animate-pulse rounded bg-muted" />
    </div>
  ),
});

export interface FilePreviewProps {
  fileId: string;
  className?: string;
  /** Signed URL expiry. Default 1h. */
  urlExpiresIn?: number;
}

export function FilePreview({
  fileId,
  className,
  urlExpiresIn = 3600,
}: FilePreviewProps) {
  const file = useAppSelector((s) => selectFileById(s, fileId));
  const { url, loading } = useSignedUrl(fileId, { expiresIn: urlExpiresIn });
  const actions = useFileActions(fileId);

  const capability = useMemo(() => {
    if (!file) return null;
    return getPreviewCapability(
      file.fileName,
      file.mimeType,
      file.fileSize,
    );
  }, [file]);

  if (!file) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center text-sm text-muted-foreground",
          className,
        )}
      >
        File not found.
      </div>
    );
  }

  if (!capability) return null;

  if (!capability.canPreview || !capability.sizeOk) {
    return (
      <GenericPreview
        fileName={file.fileName}
        fileSize={file.fileSize}
        onDownload={() => void actions.download()}
        message={
          !capability.sizeOk
            ? "This file is too large to preview inline."
            : undefined
        }
        className={className}
      />
    );
  }

  // Early spinner for not-yet-fetched URL (images/video/audio need it).
  if (loading && !url) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-muted/20",
          className,
        )}
      >
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  switch (capability.previewKind) {
    case "image":
      return (
        <ImagePreview url={url} fileName={file.fileName} className={className} />
      );
    case "video":
      return (
        <VideoPreview
          url={url}
          mimeType={file.mimeType}
          className={className}
        />
      );
    case "audio":
      return (
        <AudioPreview
          url={url}
          fileName={file.fileName}
          mimeType={file.mimeType}
          className={className}
        />
      );
    case "pdf":
      return <PdfPreview url={url} className={className} />;
    case "code":
    case "text":
    case "data":
      return <TextPreview url={url} className={className} />;
    case "spreadsheet":
    case "generic":
    default:
      return (
        <GenericPreview
          fileName={file.fileName}
          fileSize={file.fileSize}
          onDownload={() => void actions.download()}
          className={className}
        />
      );
  }
}
