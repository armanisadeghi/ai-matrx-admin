// app/(ssr)/ssr/notes/layout.tsx
// Synchronous layout — no auth, no DB, no async work.
// SidebarClient and NotesWorkspace fetch their own data after mount via Supabase client.

import "./notes.css";
import SidebarClient from "./_components/SidebarClient";
import NotesWorkspace from "./_components/NotesWorkspace";

export const metadata = {
  title: "Notes | AI Matrx",
  description: "Create and manage your notes and documents",
};

// Lightweight note shape for the sidebar — no content field
export interface NoteSummary {
  id: string;
  label: string;
  folder_name: string;
  tags: string[];
  updated_at: string;
  position: number;
}

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="notes-root">
      <aside className="notes-sidebar flex flex-col overflow-hidden border-r border-border/30">
        <SidebarClient />
      </aside>

      <div className="notes-content flex flex-col overflow-hidden">
        <NotesWorkspace />
        <div style={{ display: "none" }}>{children}</div>
      </div>
    </div>
  );
}
