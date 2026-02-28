"use client";

// TabBarClient — Client island for the horizontal tab bar.
// Reads open tabs from the `tabs` URL searchParam (comma-separated note IDs).
// Each tab is a link to the note — clicking navigates via startTransition.
// Close buttons remove the tab ID from the URL param.

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import { X } from "lucide-react";
import type { NoteSummary } from "../layout";

interface TabBarClientProps {
  notes: NoteSummary[];
}

export default function TabBarClient({ notes }: TabBarClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Active note from URL path
  const activeNoteId = pathname.startsWith("/ssr/notes/")
    ? pathname.split("/ssr/notes/")[1]?.split("/")[0]?.split("?")[0] ?? ""
    : "";

  // Open tabs from URL param
  const tabIds = useMemo(() => {
    return searchParams.get("tabs")?.split(",").filter(Boolean) ?? [];
  }, [searchParams]);

  // Build a label map for quick lookup
  const labelMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const note of notes) {
      map[note.id] = note.label;
    }
    return map;
  }, [notes]);

  // Only show tabs that exist in the notes list
  const visibleTabs = useMemo(() => {
    return tabIds.filter((id) => labelMap[id]);
  }, [tabIds, labelMap]);

  // Navigate to a tab
  const switchTab = useCallback(
    (noteId: string) => {
      if (noteId === activeNoteId) return;
      const qs = searchParams.toString();
      startTransition(() => {
        router.push(`/ssr/notes/${noteId}${qs ? `?${qs}` : ""}`);
      });
    },
    [router, searchParams, activeNoteId],
  );

  // Close a tab — remove from tabs param, navigate if it was active
  const closeTab = useCallback(
    (noteId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newTabs = tabIds.filter((id) => id !== noteId);
      const params = new URLSearchParams(searchParams.toString());

      if (newTabs.length > 0) {
        params.set("tabs", newTabs.join(","));
      } else {
        params.delete("tabs");
      }

      const qs = params.toString();

      startTransition(() => {
        if (noteId === activeNoteId) {
          // Navigate to the next tab, or the previous one, or the notes root
          const idx = tabIds.indexOf(noteId);
          const nextId = newTabs[idx] ?? newTabs[idx - 1] ?? "";
          if (nextId) {
            router.push(`/ssr/notes/${nextId}${qs ? `?${qs}` : ""}`);
          } else {
            router.push(`/ssr/notes${qs ? `?${qs}` : ""}`);
          }
        } else {
          // Just update the tabs param without changing the route
          router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
        }
      });
    },
    [router, pathname, searchParams, tabIds, activeNoteId],
  );

  // Don't render if no tabs are open
  if (visibleTabs.length === 0) {
    return null;
  }

  return (
    <div className="notes-tab-bar" role="tablist" aria-label="Open notes">
      {visibleTabs.map((id) => (
        <button
          key={id}
          className="notes-tab"
          role="tab"
          data-active={id === activeNoteId ? "true" : undefined}
          aria-selected={id === activeNoteId}
          onClick={() => switchTab(id)}
        >
          <span className="notes-tab-label">{labelMap[id] ?? "Untitled"}</span>
          <span
            className="notes-tab-close"
            role="button"
            aria-label={`Close ${labelMap[id] ?? "note"}`}
            onClick={(e) => closeTab(id, e)}
          >
            <X />
          </span>
        </button>
      ))}
    </div>
  );
}
