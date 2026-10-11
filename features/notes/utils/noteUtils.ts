// features/notes/utils/noteUtils.ts

import type { Note, NoteFilters, NoteSortConfig } from "../types";
import { idMatchesQuery } from "@ai-matrx/kit/search-scoring";

/**
 * Filter notes based on search, tags, and folder
 */
export function filterNotes(notes: Note[], filters: NoteFilters): Note[] {
  let filtered = [...notes];

  // Filter by search text (searches in label and content)
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (note) =>
        note.label.toLowerCase().includes(searchLower) ||
        (note.content ?? "").toLowerCase().includes(searchLower) ||
        idMatchesQuery(note, searchLower),
    );
  }

  // Filter by tags (note must have all selected tags)
  const tags = filters.tags;
  if (tags && tags.length > 0) {
    filtered = filtered.filter((note) =>
      tags.every((tag) => (note.tags ?? []).includes(tag)),
    );
  }

  return filtered;
}

/**
 * Sort notes based on field and order
 */
export function sortNotes(notes: Note[], sortConfig: NoteSortConfig): Note[] {
  const sorted = [...notes];

  sorted.sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (sortConfig.field) {
      case "label":
        aVal = a.label.toLowerCase();
        bVal = b.label.toLowerCase();
        break;
      case "created_at":
        aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
        bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
        break;
      case "updated_at":
        aVal = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        bVal = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortConfig.order === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.order === "asc" ? 1 : -1;
    return 0;
  });

  return sorted;
}

/**
 * Extract all unique tags from notes
 */
export function extractUniqueTags(notes: Note[]): string[] {
  const allTags = notes.flatMap((note) => note.tags ?? []);
  return Array.from(new Set(allTags)).sort();
}

/**
 * Whether a note's content is empty (null, undefined, or whitespace-only).
 *
 * Single source of truth for "does this note have anything worth losing" —
 * drives the empty-new-note dedup logic below AND the delete-confirmation
 * skip rule (an empty note deletes instantly, no dialog).
 */
export function isNoteContentEmpty(
  content: string | null | undefined,
): boolean {
  return !content || content.trim() === "";
}

/**
 * Find an existing empty note (no content and "New Note" label or variants like "New Note 1", "New Note 2", etc.)
 * This prevents duplicate empty notes from accumulating
 */
export function findEmptyNewNote(notes: Note[]): Note | null {
  return (
    notes.find((note) => {
      if (!isNoteContentEmpty(note.content)) return false;

      // Check if label is "New Note" or "New Note [number]"
      const isNewNoteLabel =
        note.label === "New Note" || /^New Note \d+$/.test(note.label);
      return isNewNoteLabel;
    }) || null
  );
}

/**
 * Generate a unique label for a new note
 * IMPORTANT: Only generates numbered variants if base label exists AND is not empty
 * This prevents creating "New Note 1" when "New Note" exists but is empty (we should reuse the empty one)
 */
export function generateUniqueLabel(
  existingNotes: Note[],
  baseLabel = "New Note",
): string {
  // Check if base label exists
  const baseNote = existingNotes.find((n) => n.label === baseLabel);

  // If base label doesn't exist, use it
  if (!baseNote) {
    return baseLabel;
  }

  // If base label exists but is empty, this is a problem!
  // The caller should have found and reused this empty note instead
  // But we'll return the base label anyway - duplicate checking should handle this
  const isBaseEmpty = isNoteContentEmpty(baseNote.content);
  if (isBaseEmpty) {
    console.warn(
      `generateUniqueLabel: "${baseLabel}" exists but is empty. Should be reused, not duplicated.`,
    );
    return baseLabel;
  }

  // Base label exists and has content, so find next available number
  let counter = 1;
  const existingLabels = new Set(existingNotes.map((n) => n.label));

  while (existingLabels.has(`${baseLabel} ${counter}`)) {
    // Check if this numbered variant is empty
    const numberedNote = existingNotes.find(
      (n) => n.label === `${baseLabel} ${counter}`,
    );
    if (numberedNote && isNoteContentEmpty(numberedNote.content)) {
      console.warn(
        `generateUniqueLabel: "${baseLabel} ${counter}" exists but is empty. Should be reused, not duplicated.`,
      );
      return `${baseLabel} ${counter}`;
    }
    counter++;
  }

  return `${baseLabel} ${counter}`;
}
