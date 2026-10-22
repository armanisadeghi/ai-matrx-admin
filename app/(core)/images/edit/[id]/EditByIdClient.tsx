"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectFileName } from "@/features/files/redux/selectors";
import { useMediaSrc } from "@ai-matrx/media/core";
import { Button } from "@ai-matrx/design-system/controls";
import { useState } from "react";
import type { ImageSource } from "@/features/image-studio/modes/shared/types";

const EditModeShell = dynamic(
  () =>
    import("@/features/image-studio/modes/edit/EditModeShell").then((m) => ({
      default: m.EditModeShell,
    })),
  { ssr: false },
);

interface Props {
  cloudFileId: string;
  folder?: string;
}

/**
 * Load the file through `useMediaSrc` (crossOrigin — the editor draws it on
 * a canvas): public files come straight from the CDN, private ones as a
 * bearer-fetched object URL. The editor receives the cloud file id, so its
 * own source hook makes the same decision; this page only gates the states
 * around it (refused → AccessGate, loading → spinner).
 */
export default function EditByIdClient(props: Props) {
  // A fresh mount re-reads the bytes: "Try again" after a network failure.
  const [attempt, setAttempt] = useState(0);
  return (
    <EditById
      key={`${props.cloudFileId}:${attempt}`}
      {...props}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  );
}

function EditById({
  cloudFileId,
  folder,
  onRetry,
}: Props & { onRetry: () => void }) {
  const media = useMediaSrc(cloudFileId, { crossOrigin: true });
  const fileName = useAppSelector((s) => selectFileName(s, cloudFileId));

  // The resolver refused the file (denied, deleted, missing). Without this the
  // page spun "Loading image…" forever. The gate asks the platform which state
  // it is and offers the way forward.
  // The bytes did not arrive (network, server) — a retry can help; this is
  // not an access answer, so never show the access gate for it.
  if (media.failureReason === "blob" || media.failureReason === "element-load") {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-background">
        <span className="text-sm text-muted-foreground">This image could not be loaded</span>
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (media.failed) {
    return (
      <div className="h-full w-full overflow-hidden bg-background">
        <AccessGate
          token="file"
          id={cloudFileId}
          fallbackHref="/images"
          fallbackLabel="Your images"
        />
      </div>
    );
  }

  if (!media.src) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading image…
        </div>
      </div>
    );
  }

  const source: ImageSource = {
    kind: "cloudFileId",
    cloudFileId,
    suggestedFilename: fileName ?? "image",
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-background">
      {/* key forces a full remount when the file id changes (e.g. after
          "Save as duplicate" navigates to the new file) so the editor's
          internal state never points at the previous file. */}
      <EditModeShell
        key={cloudFileId}
        source={source}
        cloudFileId={cloudFileId}
        defaultFolder={folder ?? "Images/Edited"}
        presentation="page"
      />
    </div>
  );
}
