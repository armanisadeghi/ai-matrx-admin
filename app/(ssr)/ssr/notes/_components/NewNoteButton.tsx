"use client";

// NewNoteButton — Tiny client island for creating a new note.
// Creates via Supabase client, then reloads to refresh the layout's
// server-fetched note list. Creating a note is infrequent enough that
// a full reload is acceptable to keep the architecture clean.

import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/utils/supabase/client";

export default function NewNoteButton() {
  const searchParams = useSearchParams();
  const [creating, setCreating] = useState(false);

  const createNote = useCallback(async () => {
    if (creating) return;
    setCreating(true);

    try {
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

      // Navigate to the new note and reload to refresh layout's note list
      const params = new URLSearchParams(searchParams.toString());
      const tabs = params.get("tabs")?.split(",").filter(Boolean) ?? [];
      tabs.push(note.id);
      params.set("tabs", tabs.join(","));
      const qs = params.toString();

      // Set the URL then reload so the server layout picks up the new note
      window.location.href = `/ssr/notes/${note.id}${qs ? `?${qs}` : ""}`;
    } finally {
      setCreating(false);
    }
  }, [searchParams, creating]);

  return (
    <button
      className="notes-new-btn"
      onClick={createNote}
      disabled={creating}
      title="New Note"
      aria-label="Create new note"
    >
      <Plus />
    </button>
  );
}
