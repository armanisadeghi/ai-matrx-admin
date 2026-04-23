/**
 * app/(a)/cloud-files/trash/_client.tsx
 */

"use client";

import { EmbeddedShell } from "@/features/files";

export function TrashClient() {
  return (
    <EmbeddedShell
      scope={{
        kind: "custom",
        filter: (file) => file.deletedAt != null,
      }}
      emptyState="Trash is empty."
      className="h-full w-full"
    />
  );
}
