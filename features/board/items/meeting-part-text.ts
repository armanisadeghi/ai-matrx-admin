/**
 * The text of a meeting part as its tile shows it right now, for "Send to Notes".
 *
 * The tile's body (features/meet/components/board/MeetingNotesBodies.tsx) hands
 * the text it renders to `publishMeetingPartText` on every render, from the
 * same data it draws (the room's live seam, or the durable record). The menu
 * action reads it back at the moment of sending. No reads, no second source.
 * Pure: no React, no Supabase.
 */

import type { MeetingPart } from "./meeting-items.logic";

interface NoteLike {
  readonly text: string;
  readonly assigneeDisplayName?: string | null;
}

interface LineLike {
  readonly speaker: string;
  readonly text: string;
}

/** One part as plain text; empty string when the part has nothing. */
export function meetingPartText(
  part: MeetingPart,
  src: {
    notes?: readonly NoteLike[];
    decisions?: readonly NoteLike[];
    actionItems?: readonly NoteLike[];
    summary?: NoteLike | null;
    transcript?: readonly LineLike[];
  },
): string {
  const bullets = (list: readonly NoteLike[] | undefined, withOwner: boolean) =>
    (list ?? [])
      .filter((n) => n.text.trim())
      .map((n) => `- ${n.text.trim()}${withOwner && n.assigneeDisplayName ? ` (${n.assigneeDisplayName})` : ""}`)
      .join("\n");
  switch (part) {
    case "transcript":
      return (src.transcript ?? [])
        .filter((l) => l.text.trim())
        .map((l) => `**${l.speaker}** ${l.text.trim()}`)
        .join("\n\n");
    case "notes":
      return bullets(src.notes, false);
    case "decisions":
      return bullets(src.decisions, false);
    case "actions":
      return bullets(src.actionItems, true);
    case "summary":
      return src.summary?.text.trim() ?? "";
  }
}

const published = new Map<string, string>();
const keyOf = (meetingId: string, part: MeetingPart) => `${meetingId}|${part}`;

export function publishMeetingPartText(meetingId: string, part: MeetingPart, text: string): void {
  published.set(keyOf(meetingId, part), text);
}

export function publishedMeetingPartText(meetingId: string, part: MeetingPart): string {
  return published.get(keyOf(meetingId, part)) ?? "";
}
