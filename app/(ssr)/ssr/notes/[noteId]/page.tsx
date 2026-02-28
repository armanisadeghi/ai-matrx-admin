// app/(ssr)/ssr/notes/[noteId]/page.tsx — Server-rendered note detail page
// Fetches the full note content server-side (including content field).
// EditorIsland is a "use client" component — Next.js handles the boundary
// automatically and code-splits per route (no explicit dynamic import needed).
// The surrounding layout (sidebar, tab bar, shell) does NOT re-render.

import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import EditorIsland from "../_components/EditorIsland";

interface PageProps {
  params: Promise<{ noteId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { noteId } = await params;
  const supabase = await createClient();
  const { data: note } = await supabase
    .from("notes")
    .select("label")
    .eq("id", noteId)
    .single();

  return {
    title: note?.label ? `${note.label} | Notes | AI Matrx` : "Note | AI Matrx",
  };
}

export default async function NotePage({ params }: PageProps) {
  const { noteId } = await params;
  const supabase = await createClient();

  const { data: note, error } = await supabase
    .from("notes")
    .select("id, label, content, folder_name, tags, metadata, shared_with, updated_at")
    .eq("id", noteId)
    .eq("is_deleted", false)
    .single();

  if (error || !note) {
    notFound();
  }

  // Serialize note data for the client component
  const noteData = {
    id: note.id,
    label: note.label ?? "Untitled",
    content: note.content ?? "",
    folder_name: note.folder_name ?? "Draft",
    tags: (note.tags as string[]) ?? [],
    metadata: (note.metadata as Record<string, unknown>) ?? {},
    updated_at: note.updated_at ?? "",
  };

  return <EditorIsland note={noteData} />;
}
