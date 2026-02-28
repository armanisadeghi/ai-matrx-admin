// app/(ssr)/ssr/notes/layout.tsx — Server-Rendered Notes Layout
// Fetches the user's note list server-side (lightweight: no content field).
// Renders a two-panel layout: sidebar (note list) + main content area.
// Client components receive server-fetched data as props — zero client fetching.

import "./notes.css";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SidebarClient from "./_components/SidebarClient";
import TabBarClient from "./_components/TabBarClient";

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

export default async function NotesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all notes for this user — lightweight query, no content column
  const { data: notes } = await supabase
    .from("notes")
    .select("id, label, folder_name, tags, updated_at, position")
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  const notesList: NoteSummary[] = (notes ?? []).map((n) => ({
    id: n.id,
    label: n.label ?? "Untitled",
    folder_name: n.folder_name ?? "Draft",
    tags: n.tags ?? [],
    updated_at: n.updated_at ?? "",
    position: n.position ?? 0,
  }));

  // Extract unique folders with counts
  const folderCounts: Record<string, number> = {};
  for (const note of notesList) {
    folderCounts[note.folder_name] = (folderCounts[note.folder_name] ?? 0) + 1;
  }

  // Extract unique tags
  const allTags = Array.from(new Set(notesList.flatMap((n) => n.tags))).sort();

  return (
    <div className="notes-root">
      {/* Sidebar — client component for filtering/search, receives server data */}
      <aside className="notes-sidebar">
        <SidebarClient
          notes={notesList}
          folderCounts={folderCounts}
          allTags={allTags}
        />
      </aside>

      {/* Main content — tab bar + editor area */}
      <div className="notes-content">
        <TabBarClient notes={notesList} />
        {children}
      </div>
    </div>
  );
}
