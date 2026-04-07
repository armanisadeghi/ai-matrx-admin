// app/(ssr)/ssr/notes/layout.tsx
// New 6-layer architecture. NotesView handles everything via Redux.
// No prop drilling. Each layer reads its own selectors.

import "./notes.css";
import { NotesView } from "@/features/notes/components/NotesView";

export const metadata = {
  title: "Notes | AI Matrx",
  description: "Create and manage your notes and documents",
};

// DEPRECATED — kept for backward compatibility during migration.
// Remove once old SidebarClient and NotesWorkspace are deleted.
export interface NoteSummary {
  id: string;
  label: string;
  folder_name: string;
  tags: string[];
  updated_at: string;
  position: number;
}

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="notes-root h-full overflow-hidden relative z-0"
      style={{ paddingTop: "var(--shell-header-h)" }}
    >
      {/* Shell sentinel — hides the dock on this route */}
      <span className="shell-hide-dock" aria-hidden="true" />

      {/* NotesView: Layer 6 instance wrapper. Renders sidebar + tabs + editor. */}
      <NotesView className="h-full" />

      {/* Children slot for sub-routes (e.g., /notes/share/[id]) */}
      <div style={{ display: "none" }}>{children}</div>
    </div>
  );
}
