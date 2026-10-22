"use client";

// features/visual-map-lab/Screenshot.tsx — one stored screenshot (a platform file) with its id.

import { RecordId } from "@ai-matrx/design-system";
import { useFileBlob } from "@/features/files/hooks/useFileBlob";

export function StoredScreenshot({ fileId, label }: { fileId: string; label?: string }) {
  const { url, loading, error } = useFileBlob(fileId);
  return (
    <figure className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        {label ? <span className="type-secondary font-medium">{label}</span> : <span />}
        <RecordId value={fileId} label="Screenshot file" />
      </div>
      {url ? (
        <img src={url} alt={label ?? "Screenshot"} className="max-w-full rounded-md border border-border" />
      ) : (
        <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border type-secondary text-muted-foreground">
          {loading ? "Loading" : (error ?? "Unavailable")}
        </div>
      )}
    </figure>
  );
}
