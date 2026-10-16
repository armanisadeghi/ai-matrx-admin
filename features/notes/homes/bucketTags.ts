// features/notes/homes/bucketTags.ts
//
// Code-owned note buckets (item homes, 2026-10-10). Folders are retired: a
// feature that keeps "its" notes together stamps a TAG of this name when it
// creates one and finds them by that tag. The note's home stays the database
// default (the General of the organization the write carries).
import { CHAT_NOTE_BUCKET_TAGS } from "@ai-matrx/chat/agents/components/messages-display/rich-document/actions/utils";

export const NOTE_BUCKET_TAGS = {
  // The two a message action stamps are @ai-matrx/chat's (message-actions W2a): one value for the
  // words a save writes and the words a home reads.
  chatSaves: CHAT_NOTE_BUCKET_TAGS.chatSaves,
  voiceNotes: "Voice Notes",
  studyNotes: "Study Notes",
  stickyNotes: "Sticky notes",
  masterworkSources: "Masterwork Sources",
  quickSaves: CHAT_NOTE_BUCKET_TAGS.quickSaves,
} as const;

export type NoteBucketTag = (typeof NOTE_BUCKET_TAGS)[keyof typeof NOTE_BUCKET_TAGS];

/** Does this note carry the bucket's tag (exact, as stamped)? */
export function noteHasBucketTag(note: { tags?: readonly string[] | null }, tag: NoteBucketTag): boolean {
  return Boolean(note.tags?.includes(tag));
}
