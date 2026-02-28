"use client";

// NewNoteButton — Tiny client island for creating a new note.
// Calls Supabase client-side, then navigates to the new note.
// Uses router.refresh() to invalidate the layout's server cache (note list).

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/utils/supabase/client";

export default function NewNoteButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const createNote = useCallback(async () => {
    if (isPending) return;

    // Get current folder from URL, default to "Draft"
    const folder = searchParams.get("folder") || "Draft";

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) return;

    const { data: note, error } = await supabase
      .from("notes")
      .insert({
        user_id: userData.user.id,
        label: "New Note",
        content: "",
        folder_name: folder,
        tags: [],
        metadata: {},
        position: 0,
      })
      .select("id")
      .single();

    if (error || !note) {
      console.error("Failed to create note:", error);
      return;
    }

    // Add the new note to tabs and navigate
    const params = new URLSearchParams(searchParams.toString());
    const currentTabs = params.get("tabs")?.split(",").filter(Boolean) ?? [];
    currentTabs.push(note.id);
    params.set("tabs", currentTabs.join(","));
    const qs = params.toString();

    startTransition(() => {
      // Refresh layout cache (so sidebar gets the new note)
      router.refresh();
      // Navigate to the new note
      router.push(`/ssr/notes/${note.id}${qs ? `?${qs}` : ""}`);
    });
  }, [router, searchParams, isPending]);

  return (
    <button
      className="notes-new-btn"
      onClick={createNote}
      disabled={isPending}
      title="New Note"
      aria-label="Create new note"
    >
      <Plus />
    </button>
  );
}
