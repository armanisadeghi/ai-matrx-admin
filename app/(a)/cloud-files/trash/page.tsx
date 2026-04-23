/**
 * app/(a)/cloud-files/trash/page.tsx
 *
 * Soft-deleted files. Uses EmbeddedShell with a custom filter — keeps the
 * implementation tiny and avoids duplicating the WindowPanelShell Trash tab.
 *
 * Restore / purge actions are not in the core components yet — Phase 7 will
 * add them; for now this is a read-only listing with explicit empty-state.
 */

import { TrashClient } from "./_client";

export default function CloudFilesTrashPage() {
  return (
    <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden bg-background">
      <header className="flex items-center gap-2 border-b bg-muted/20 px-4 py-2 shrink-0">
        <h1 className="text-sm font-medium">Trash</h1>
        <span className="text-xs text-muted-foreground">
          Files here are hidden from the main view. Versions keep the bytes
          recoverable for 30 days.
        </span>
      </header>
      <div className="flex-1 overflow-hidden">
        <TrashClient />
      </div>
    </div>
  );
}
