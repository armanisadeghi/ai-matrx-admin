// app/(ssr)/ssr/notes/layout.tsx
// Synchronous layout — no auth, no DB, no async work.
// SidebarClient and NotesWorkspace fetch their own data after mount via Supabase client.

import "./notes.css";
import SidebarClient from "./_components/SidebarClient";
import NotesWorkspace from "./_components/NotesWorkspace";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/notes", {
  titlePrefix: "SSR",
  title: "Notes",
  description: "SSR notes workspace with client-side data loading",
  letter: "Ns",
});

// Lightweight note shape for the sidebar — no content field
export interface NoteSummary {
  id: string;
  label: string;
  folder_name: string;
  tags: string[];
  updated_at: string;
  position: number;
}

const highlightStyles = `
/* CSS Highlights API for the markdown preview panel. */
::highlight(notes-find-match) {
  background-color: hsl(48 100% 60% / 0.45);
  color: inherit;
}
::highlight(notes-find-match-active) {
  background-color: hsl(24 100% 55% / 0.7);
  color: inherit;
}
.dark ::highlight(notes-find-match) {
  background-color: hsl(48 100% 55% / 0.35);
}
.dark ::highlight(notes-find-match-active) {
  background-color: hsl(24 100% 55% / 0.55);
}
`;

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="notes-root grid grid-cols-[280px_1fr] grid-rows-[1fr] h-full overflow-hidden relative z-0"
      style={{ paddingTop: "var(--shell-header-h)" }}
    >
      {/* Shell sentinels — one class, zero logic. shell.css handles all consequences. */}
      <style dangerouslySetInnerHTML={{ __html: highlightStyles }} />
      <span className="shell-hide-dock" aria-hidden="true" />
      <aside className="notes-sidebar flex flex-col overflow-hidden border-r border-border/30 pt-0 pb-2.5">
        <SidebarClient />
      </aside>

      <div className="notes-content flex flex-col overflow-hidden">
        <NotesWorkspace />
        <div style={{ display: "none" }}>{children}</div>
      </div>
    </div>
  );
}
