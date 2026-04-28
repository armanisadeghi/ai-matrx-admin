/**
 * features/files/components/core/FileEditor/CloudFileEditorHost.tsx
 *
 * Single mount point for opening the cloud-file editor. Mirrors the
 * RenameHost pattern: anyone fires `requestEdit(fileId)` and the host
 * mounts a `<CloudFileEditor>` for that file.
 */

"use client";

import { useEffect, useState } from "react";
import { CloudFileEditor } from "./CloudFileEditor";

const EVENT_NAME = "cloud-files:open-editor";

export function requestEdit(fileId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ fileId: string }>(EVENT_NAME, { detail: { fileId } }),
  );
}

export function CloudFileEditorHost() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ fileId: string }>).detail;
      if (detail?.fileId) setTarget(detail.fileId);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  if (!target) return null;
  return (
    <CloudFileEditor
      open
      onOpenChange={(open) => {
        if (!open) setTarget(null);
      }}
      fileId={target}
    />
  );
}
